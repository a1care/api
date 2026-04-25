import jwt from 'jsonwebtoken'
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "./patient.model.js";
import { patientValidation } from "./patient.schema.js";
import mongoose from 'mongoose';
import { enqueueEmail } from "../../queues/communicationQueue.js";
import { formatZodError } from "../../utils/formatZodError.js";
import sendAlotsSms from "../../utils/alotsSms.js";
import RedisClient from "../../configs/redisConnect.js";

// ─── DEV BYPASS CONSTANTS ─────────────────────────────────────────────────────
// const DEV_BYPASS_OTP = "123456";
// ─────────────────────────────────────────────────────────────────────────────

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

  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in Redis with 10-minute expiry
  await RedisClient.setEx(`otp:patient:${cleanMobile}`, 600, otp);

  // Send via Alots
  const result = await sendAlotsSms(cleanMobile, otp);

  if (!result.success) {
    console.error("[Patient OTP Send Failed]", result.message);
  }

  console.log(`[Patient OTP] Sent ${otp} to ${cleanMobile}`);

  return res.status(200).json(
    new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile })
  );
})

// verify otp 
export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { idToken, mobileNumber, otp } = req.body
  const cleanMobile = (mobileNumber || "").replace(/^\+91/, "").replace(/\D/g, "");

  // Check Redis for manual OTP if provided
  if (otp && cleanMobile) {
    const storedOtp = await RedisClient.get(`otp:patient:${cleanMobile}`);
    if (storedOtp && String(storedOtp) === String(otp)) {
      console.log(`[OTP] ✅ Patient verified via Redis for: ${cleanMobile}`);
      
      // Cleanup OTP
      await RedisClient.del(`otp:patient:${cleanMobile}`);

      let patient = await Patient.findOne({
        mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] }
      });
      if (!patient) {
        patient = new Patient({ mobileNumber: `+91${cleanMobile}` });
        await patient.save();
      }

      const token = jwt.sign(
        { mobileNumber: patient.mobileNumber, userId: patient._id },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      return res.status(200).json(new ApiResponse(200, "Verification successful", { token }));
    } else if (storedOtp) {
       throw new ApiError(400, "Invalid OTP provided.");
    }
  }

  if (!idToken) {
    throw new ApiError(400, "Firebase ID token is required!")
  }

  try {
    // 1. Verify the secure Firebase Token
    const admin = (await import('../../configs/fcmConfig.js')) as any;
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 2. Extract verified data
    const firebasePhone = decodedToken.phone_number;
    const firebaseEmail = decodedToken.email;
    
    // Search for patient by email first to find existing phone number
    let patient = null;
    if (firebaseEmail) {
        patient = await Patient.findOne({ email: firebaseEmail });
    }

    const finalPhone = firebasePhone || mobileNumber || (patient ? patient.mobileNumber : null);

    if (!finalPhone) {
      throw new ApiError(400, "Mobile number is required for new accounts. Please enter your mobile number and tap Google Sign-in again.");
    }

    // 3. Find or create the user in your database
    if (!patient) {
        patient = await Patient.findOne({ mobileNumber: finalPhone.replace(/^\+91/, "").replace(/\D/g, "") });
    }
    
    if (!patient) {
        patient = await Patient.findOne({ mobileNumber: finalPhone });
    }

    if (!patient) {
      const newPatient = new Patient({ 
        mobileNumber: finalPhone,
        email: firebaseEmail // Auto-set email from Google if new account
      });
      await newPatient.save();
      patient = newPatient;
    } else if (firebaseEmail && !patient.email) {
      // Link email if it's currently missing
      patient.email = firebaseEmail;
      await patient.save();
    }

    // 4. Generate your own custom JWT Token
    const token = jwt.sign(
      { mobileNumber: patient.mobileNumber, userId: patient._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    )

    return res.status(200).json(new ApiResponse(200, "Firebase Verification successful", { token }))

  } catch (error: any) {
    console.error("Firebase Token Error:", error);
    throw new ApiError(401, error.message || "Invalid or expired Firebase Token!")
  }
})

export const updateProfile = asyncHandler(async (req, res) => {
  // 1. Validate input
  console.log("this is the body we are getting..", req.body)
  const parsed = patientValidation.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      formatZodError(parsed.error)
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
