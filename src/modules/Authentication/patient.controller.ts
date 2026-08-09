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
import { recordReferralUse } from "../Referral/referral.controller.js";

// ⭐⭐⭐ STATIC TEST NUMBER ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
const STATIC_TEST_MOBILES = ["8309470360", "6302759527", "9666210561"];
const STATIC_TEST_OTP = "137460";
// ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

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

  const patient = await Patient.findOne({
    $or: [
      { mobileNumber: cleanMobile },
      { mobileNumber: `+91${cleanMobile}` }
    ]
  });

  if (patient?.isDeleted) {
    return res.status(403).json(new ApiResponse(403, "ACCOUNT_DELETED", { isDeleted: true }));
  }

  // Static test number — bypass OTP when ALLOW_TEST_OTP env var is set
  if (STATIC_TEST_MOBILES.includes(cleanMobile) && process.env.ALLOW_TEST_OTP?.trim() === "true") {
    await RedisClient.setEx(`otp:patient:${cleanMobile}`, 600, STATIC_TEST_OTP);
    console.log(`[Patient OTP] Static test number — OTP bypassed for ${cleanMobile}`);
    return res.status(200).json(
      new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile })
    );
  }

  // Per-phone throttle (complements the per-IP express-rate-limit) so one number can't
  // be flooded with SMS from rotating IPs.
  const attemptKey = `otp:attempts:patient:${cleanMobile}`;
  const attempts = await RedisClient.get(attemptKey);
  if (Number(attempts || 0) >= 5) {
    throw new ApiError(429, "You've requested too many OTPs recently. For your security, please wait a few minutes before trying again.");
  }
  await RedisClient.setEx(attemptKey, 600, String(Number(attempts || 0) + 1));

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in Redis with 10-minute expiry
  await RedisClient.setEx(`otp:patient:${cleanMobile}`, 600, otp);

  // Send via Alots
  const result = await sendAlotsSms(cleanMobile, otp);

  if (!result.success) {
    console.error("[Patient OTP Send Failed]", result.message);
  }

  if (process.env.NODE_ENV !== "production") console.log(`[Patient OTP] Sent to ${cleanMobile}`);

  return res.status(200).json(
    new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile })
  );
})

export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { idToken, mobileNumber, otp } = req.body
  const cleanMobile = (mobileNumber || "").replace(/^\+91/, "").replace(/\D/g, "");

  // Check Redis for manual OTP if provided
  if (otp && cleanMobile) {
    const isStaticBypass = STATIC_TEST_MOBILES.includes(cleanMobile) && String(otp) === STATIC_TEST_OTP;
    const storedOtp = isStaticBypass ? STATIC_TEST_OTP : await RedisClient.get(`otp:patient:${cleanMobile}`);
    if (storedOtp && String(storedOtp) === String(otp)) {
      console.log(`[OTP] ✅ Patient verified via Redis or Bypass for: ${cleanMobile}`);
      
      // Cleanup OTP
      if (!isStaticBypass) {
        await RedisClient.del(`otp:patient:${cleanMobile}`);
      }

      let patient = await Patient.findOne({
        mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] }
      });
      if (patient && (patient.isDeleted || patient.deletedAt)) {
        throw new ApiError(403, "Your account is deleted to restore your account, contact newadmin@a1care.com");
      }
      if (!patient) {
        patient = new Patient({ mobileNumber: `+91${cleanMobile}` });
        await patient.save();
      }

      const token = jwt.sign(
        { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'access' },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );
      const refreshToken = jwt.sign(
        { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'refresh' },
        process.env.JWT_SECRET as string,
        { expiresIn: "30d" }
      );

      return res.status(200).json(new ApiResponse(200, "Verification successful", { token, refreshToken }));
    } else if (storedOtp) {
       throw new ApiError(400, "Invalid OTP provided.");
    }
  }

  if (!idToken) {
    throw new ApiError(400, "Firebase ID token is required!")
  }

  try {
    // 1. Verify the secure Firebase Token
    const { default: firebaseAdmin } = await import('firebase-admin');
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);

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

    if (patient && (patient.isDeleted || patient.deletedAt)) {
        throw new ApiError(403, "Your account is deleted to restore your account, contact newadmin@a1care.com");
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
      { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'access' },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign(
      { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'refresh' },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return res.status(200).json(new ApiResponse(200, "Firebase Verification successful", { token, refreshToken }))

  } catch (error: any) {
    console.error("Firebase Token Error:", error);
    throw new ApiError(401, error.message || "Invalid or expired Firebase Token!")
  }
})

export const updateProfile = asyncHandler(async (req, res) => {
  // 1. Validate input
  const parsed = patientValidation.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      formatZodError(parsed.error)
    );
  }

  // 2. Get patient id from auth middleware
  const patientId = req.user?.id

  // Capture prior registration state BEFORE the update so the welcome email
  // only fires on the first time the patient completes registration.
  const priorPatient = await Patient.findById(patientId).select("isRegistered referralCode");
  const wasNotRegistered = !priorPatient?.isRegistered;

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

  // 3b. Process referral code if provided on FIRST registration
  if (parsed.data.referredByCode && wasNotRegistered) {
    try {
      await recordReferralUse(String(patientId), "Patient", parsed.data.referredByCode);
    } catch (e) {
      console.error("[Referral] Failed to record referral use:", e);
    }
  }

  // 4. Handle not found
  if (!updatedPatient) {
    throw new ApiError(404, "Patient not found");
  }

  // 4b. Auto-generate a referral code on first profile completion
  if (!updatedPatient.referralCode) {
    try {
      const { randomBytes } = await import("crypto");
      let code = "";
      let exists = true;
      do {
        code = randomBytes(3).toString("hex").toUpperCase();
        exists = !!(await Patient.findOne({ referralCode: code }));
      } while (exists);
      // Targeted update — avoids re-running full-document validators via .save()
      await Patient.findByIdAndUpdate(patientId, { referralCode: code });
      updatedPatient.referralCode = code; // reflect in the response payload
    } catch (e) {
      console.error("[Referral] code generation error:", e);
    }
  }

  // 5. Send Welcome Email only on the first time the patient completes registration
  if (updatedPatient.email && wasNotRegistered) {
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

// Dedicated FCM token update (so app restarts don't require a full profile update)
export const updatePatientFcmToken = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  const { fcmToken } = req.body;
  if (!fcmToken) throw new ApiError(400, "FCM Token is required");
  await Patient.findByIdAndUpdate(patientId, { fcmToken });
  return res.status(200).json(new ApiResponse(200, "FCM Token updated", {}));
});

export const updateFamilyMembers = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  const { familyMembers } = req.body;
  if (!Array.isArray(familyMembers)) throw new ApiError(400, "familyMembers must be an array");
  await Patient.findByIdAndUpdate(patientId, { familyMembers });
  return res.status(200).json(new ApiResponse(200, "Family members updated", {}));
});

// Patient self-service account deletion request — surfaces in the admin Deletion
// Requests queue (admin finalises via /admin/deletion-approve/:id).
export const requestPatientDeletion = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  if (!patientId) throw new ApiError(401, "Unauthorized");

  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, "Patient not found");

  patient.deletionRequested = true;
  patient.deletionRequestedAt = new Date();
  patient.isDeleted = true;
  patient.deletedAt = new Date();
  patient.fcmToken = "";
  patient.tokenVersion = (patient.tokenVersion || 0) + 1;
  await patient.save();

  // Flush Redis token cache so the session is invalidated immediately
  try {
    const RedisClient = (await import("../../configs/redisConnect.js")).default;
    await RedisClient.del(`tv:patient:${patientId}`);
  } catch (err) {
    console.error("Redis flush error on patient delete:", err);
  }

  return res.status(200).json(new ApiResponse(200, "Account deletion requested successfully. You have been logged out.", {}));
});

export const refreshTokenForPatient = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, "Refresh token is required");

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as any;
        if (decoded.type !== 'refresh') throw new ApiError(401, "Invalid token type");

        const patient = await Patient.findById(decoded.userId);
        if (!patient) throw new ApiError(401, "User not found");
        if (patient.isDeleted || patient.deletedAt) throw new ApiError(403, "Your account is deleted to restore your account, contact newadmin@a1care.com");
        if (patient.tokenVersion !== decoded.tv) throw new ApiError(401, "Token revoked");

        const accessToken = jwt.sign(
            { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'access' },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const newRefreshToken = jwt.sign(
            { mobileNumber: patient.mobileNumber, userId: patient._id, tv: patient.tokenVersion || 0, type: 'refresh' },
            process.env.JWT_SECRET as string,
            { expiresIn: "30d" }
        );

        return res.status(200).json(new ApiResponse(200, "Token refreshed", { token: accessToken, refreshToken: newRefreshToken }));
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }
});

// Restore deleted patient account
export const restorePatientAccount = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) throw new ApiError(400, "Mobile number is required");

  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);

  const patient = await Patient.findOne({
    $or: [
      { mobileNumber: cleanMobile },
      { mobileNumber: `+91${cleanMobile}` }
    ]
  });

  if (!patient) {
    throw new ApiError(404, "User not found");
  }

  patient.isDeleted = false;
  patient.deletedAt = null;
  patient.deletionRequested = false;
  patient.deletionRequestedAt = null;
  patient.tokenVersion = (patient.tokenVersion || 0) + 1; // invalidate old tokens
  await patient.save();

  return res.status(200).json(new ApiResponse(200, "Account restored successfully", { mobileNumber }));
});
