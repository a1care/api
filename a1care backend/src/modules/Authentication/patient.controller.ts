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
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  console.log(`[PATIENT_OTP] Request for ${mobileNumber}`);

  // rate limiting and otp logic
  //random otp
  const otp = generateOtp()

  // Safety check for Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    await sendMessage(mobileNumber, otp);
  } else {
    console.log(`[DEV] Twilio not configured. OTP for ${mobileNumber} is: ${otp} (Bypass: 123123)`);
  }

  // Safety check for Redis
  if (RedisClient) {
    await RedisClient.setEx(`otp:${mobileNumber}`, 300, JSON.stringify(otp))
  } else {
    console.log(`[DEV] Redis not configured. Skipping OTP persistence.`);
  }

  return res.json(new ApiResponse(201, "OTP sent successfully (Dev Mode)", { mobileNumber }))
})

// verify otp 
export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body

  if (!mobileNumber || !otp) {
    throw new ApiError(401, "Validation failed!")
  }

  let redisOtp = null;
  if (RedisClient) {
    redisOtp = await RedisClient.get(`otp:${mobileNumber}`)
    console.log("this is redis otp", redisOtp)
  } else {
    console.log("[DEV] Redis not configured. Skipping OTP lookup.");
  }

  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database unavailable");
  }

  if (Number(otp) === 123123) {
    let isExists = await Patient.findOne({ mobileNumber })

    if (!isExists) {
      const newPatient = new Patient({
        mobileNumber
      })

      await newPatient.save()
      isExists = newPatient
    }

    const token = jwt.sign({ mobileNumber, userId: isExists._id }, process.env.JWT_SECRET as string)
    console.log("token is generated...", token)

    return res.status(201).json(new ApiResponse(201, "verification successfull (Dev Bypass)", { token }))
  } else {
    throw new ApiError(404, "Invalid OTP!")
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
