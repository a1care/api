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

  // ─── DEV BYPASS CHECK (Enabled for Development) ──────────────────────────
  const cleanMobile = (mobileNumber || "").replace(/^\+91/, "").replace(/\D/g, "");

  // if (String(otp) === DEV_BYPASS_OTP) {
  //    ...
  // }
  // ─────────────────────────────────────────────────────────────────────────────

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

  // If we reach here, no OTP was provided or matched
  throw new ApiError(400, "Valid OTP is required for login.");
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

  const patientId = req.user?.id;
  console.log("[UpdateProfile] Patient ID:", patientId, "Parsed Data:", parsed.data);

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
        location: parsed.data.location,
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
