import jwt from 'jsonwebtoken'
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "./patient.model.js";
import { patientValidation } from "./patient.schema.js";
import mongoose from 'mongoose';
import { enqueueEmail } from "../../queues/communicationQueue.js";

// ─── DEV BYPASS CONSTANTS ─────────────────────────────────────────────────────
// Use these credentials to bypass Firebase OTP for testing the full app flow
// Phone: 9701677607  |  OTP: 123123
const DEV_BYPASS_MOBILE = "9701677607";
const DEV_BYPASS_OTP = "123123";
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
  // With Firebase, the frontend requests the OTP directly from Google!
  // We no longer need the backend to send Twilio messages.
  return res.json(new ApiResponse(200, "Please request OTP directly from Firebase in the App", {}));
})

// verify otp 
export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { idToken, mobileNumber, otp } = req.body

  /* ─── DEV BYPASS CHECK (Disabled for Production) ──────────────────────────
  const cleanMobile = (mobileNumber || "").replace(/^\+91/, "").replace(/\D/g, "");

  if (cleanMobile === DEV_BYPASS_MOBILE && String(otp) === DEV_BYPASS_OTP) {
    console.log(`[DEV BYPASS] ✅ Activated for mobile: ${cleanMobile}`);

    // Find or create the patient in DB
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

    return res.status(200).json(new ApiResponse(200, "Verification successful (Dev Bypass)", { token }));
  }
  ───────────────────────────────────────────────────────────────────────────── */

  if (!idToken) {
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

    // 4. Generate your own custom JWT Token
    const token = jwt.sign(
      { mobileNumber: firebasePhone, userId: isExists._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    )
    
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
