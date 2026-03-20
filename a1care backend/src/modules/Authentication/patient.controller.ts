import jwt from 'jsonwebtoken'
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "./patient.model.js";
import { patientValidation } from "./patient.schema.js";
import mongoose from 'mongoose';
import RedisClient from '../../configs/redisConnect.js';
import generateOtp from '../../utils/generateOtp.js';
import sendMessage from '../../configs/twilioConfig.js';
import { enqueueEmail } from "../../queues/communicationQueue.js";

export const getPatientDetailsById = asyncHandler(async (req, res) => {
  const patientId = req.user?.id

  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database unavailable");
  }

  const userDetails = await Patient.findById(patientId).populate('primaryAddressId')


  if (userDetails) return res.status(200).json(new ApiResponse(200, "data fetched", userDetails))
  else {
    throw new ApiError(404, "No user found")
  }
})

export const sentOtpForPatient = asyncHandler(async (req, res) => {
  // With Firebase, the frontend requests the OTP directly from Google!
  // We no longer need the backend to send Twilio messages.
  return res.json(new ApiResponse(200, "Please request OTP directly from Firebase in the App", {}));
})

// verify otp 
export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { idToken, mobileNumber } = req.body

  if (!idToken) {
    // Fallback for dev bypass if idToken is not provided
    if (req.body.otp == 123123) {
      let isExists = await Patient.findOne({ mobileNumber })

      if (!isExists) {
        const newPatient = new Patient({ mobileNumber })
        await newPatient.save()
        isExists = newPatient
      }

      const token = jwt.sign({ mobileNumber, userId: isExists._id }, process.env.JWT_SECRET as string)
      return res.status(201).json(new ApiResponse(201, "Verification successful (Development Bypass)", { token }))
    }
    throw new ApiError(400, "Firebase ID token is required!")
  }

  try {
    // 1. Verify the secure Firebase Token
    const admin = (await import('../../configs/firebaseAdmin.js')).default;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 2. Extract the verified phone number from Google (e.g. +919876543210)
    const firebasePhone = decodedToken.phone_number || mobileNumber;

    // 3. Find or create the user in your database
    let isExists = await Patient.findOne({ mobileNumber: firebasePhone })

    if (!isExists) {
      const newPatient = new Patient({ mobileNumber: firebasePhone })
      await newPatient.save()
      isExists = newPatient
    }

    // 4. Generate your own custom original JWT Token so the rest of your app works perfectly!
    const token = jwt.sign({ mobileNumber: firebasePhone, userId: isExists._id }, process.env.JWT_SECRET as string)
    
    return res.status(200).json(new ApiResponse(200, "Firebase Verification successful", { token }))

  } catch (error) {
    console.error("Firebase Token Error:", error);
    throw new ApiError(401, "Invalid or expired Firebase Token!")
  }
})

export const updateProfile = asyncHandler(async (req, res) => {
  // 1. Validate input
  console.log("this is the body we are getting..", req.body)
  const parsed = patientValidation.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      `validation failed! ${parsed.error}`
    );
  }

  // 2. Get patient id from auth middleware
  const patientId = req.user?.id

  // 3. Update profile
  const updatedPatient = await Patient.findByIdAndUpdate(
    { _id: patientId },
    {
      $set: {
        name: parsed.data.name,
        email: parsed.data.email,
        profileImage: req.fileUrl,
        // location: parsed.data.location,
        gender: parsed.data.gender,
        dateOfBirth: parsed.data.dateOfBirth,
        fcmToken: parsed.data.fcmToken || null,
        isRegistered: true
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  // 4. Handle not found
  if (!updatedPatient) {
    throw new ApiError(404, "Patient not found");
  }

  // 5. Send Welcome Email if registering for first time
  if (updatedPatient.email && !parsed.data.isRegistered) {
    try {
      await enqueueEmail({
        kind: "welcome",
        data: {
          email: updatedPatient.email,
          fullName: updatedPatient.name || "Customer",
        },
      });
    } catch (e) {
      console.error("[Email] Welcome email error:", e);
    }
  }

  // 6. Respond
  res.status(200).json({
    success: true,
    data: updatedPatient
  });
});
