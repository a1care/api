import RedisClient from "../../configs/redisConnect.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import generateOtp from "../../utils/generateOtp.js";
import doctorModel from "./doctor.model.js";
import doctorValidation from "./doctor.schema.js";
import PartnerSubscription from "../PartnerSubscription/subscription.model.js";
import jwt from 'jsonwebtoken'
import { v1 as uuidv4 } from "uuid";
import { hmacHash } from "../../utils/Hmac.js";
import sendMessage from "../../configs/twilioConfig.js";
import sendAlotsSms from "../../utils/alotsSms.js";
import mongoose from "mongoose";
import { RoleModel } from "../roles/role.model.js";
import { sendPartnerWelcomeEmail } from "../../utils/email.js";

// ─── DEV BYPASS CONSTANTS ─────────────────────────────────────────────────────
// const DEV_BYPASS_OTP = "123456";
// ─────────────────────────────────────────────────────────────────────────────

//create doctor 
export const createDoctor = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,

  }

  const parsed = doctorValidation.safeParse(payload)
  if (!parsed.success) {
    console.error("Error in creating doctor", parsed.error)
    throw new ApiError(401, "Validation Falied!")
  }

  const newDoctor = new doctorModel(payload)
  await newDoctor.save()
  return res.status(201).json(new ApiResponse(201, "Hurray..! Doctor created.", newDoctor))
})

//get doctor by id 
export const getDoctorById = asyncHandler(async (req, res) => {
  const { doctorId } = req.params
  const gotDoctor = await doctorModel.findById(doctorId)
  return res.status(200).json(new ApiResponse(200, "doctor found..", gotDoctor))
})

//get the staff by role id
export const getStaffByRoleId = asyncHandler(async (req, res) => {
  const { roleId, specialization } = req.query
  if (!roleId) throw new ApiError(404, "Role id is missing")

  const roleIds = (roleId as string).split(',').map(id => id.trim());
  const query: any = { roleId: { $in: roleIds }, status: 'Active' };

  if (specialization) {
    query.specialization = { $in: [(specialization as string).trim()] };
  }

  const staffDetails = await doctorModel.find(query).populate('roleId')
  return res.json(new ApiResponse(200, staffDetails.length ? "staff fetched successfully" : "No staff found for this specialization", staffDetails))
})

// send otp for staff 
export const sendOtpForStaff = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in Redis with 10-minute expiry
  await RedisClient.setEx(`otp:staff:${cleanMobile}`, 600, otp);

  // Send via Alots
  const result = await sendAlotsSms(cleanMobile, otp);

  if (!result.success) {
    console.error("[OTP Send Failed]", result.message);
    // Even if SMS fails, we'll return 200 for now to not block frontend, 
    // but in production we'd want to handle this.
  }

  console.log(`[OTP] Sent ${otp} to ${cleanMobile}`);

  return res.status(200).json(
    new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile })
  );
});

//verify otp for staff 
export const verifyOtp = asyncHandler(async (req, res) => {
  console.log("[Partner Verify] Request Body:", req.body);
  const { idToken, mobileNumber, otp, roleId, role } = req.body;

  // ─── DEV BYPASS CHECK (Enabled for Development) ──────────────────────────
  const cleanMobile = (mobileNumber || "").replace(/^\+91/, "").replace(/\D/g, "");
  // if (String(otp) === DEV_BYPASS_OTP) {
  //   console.log(`[DEV BYPASS] ✅ Partner bypass activated for: ${cleanMobile}`);
  //   ... (rest of bypass logic commented out)
  // }
  // ─────────────────────────────────────────────────────────────────────────────

  // Resolve RoleId if not provided
  let resolvedRoleId = roleId;
  if (!resolvedRoleId && role) {
    const foundRole = await RoleModel.findOne({ code: role.toUpperCase() }) || await RoleModel.findOne({ name: new RegExp(role, 'i') });
    if (foundRole) resolvedRoleId = foundRole._id;
  }

  // Check Redis for manual OTP if provided
  if (otp && cleanMobile) {
    const storedOtp = await RedisClient.get(`otp:staff:${cleanMobile}`);
    if (storedOtp && String(storedOtp) === String(otp)) {
      console.log(`[OTP] ✅ Verified via Redis for: ${cleanMobile}`);


      // Cleanup OTP
      await RedisClient.del(`otp:staff:${cleanMobile}`);

      // Revert to original: Find by mobile number only (Registered first)
      let staff = await doctorModel.findOne({
        mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] }
      }).sort({ isRegistered: -1 });

      if (!staff) {
        // Create new if doesn't exist (Original behavior)
        staff = await doctorModel.create({ 
          mobileNumber: `+91${cleanMobile}`,
          roleId: roleId || undefined,
          isRegistered: false 
        });
      }

      const token = jwt.sign(
        { staffId: staff._id },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      return res.status(200).json(
        new ApiResponse(200, "Login successful", { token, user: staff })
      );
    } else if (storedOtp) {
      throw new ApiError(400, "Invalid OTP provided.");
    }
  }

  // If we reach here, no OTP was provided or matched
  throw new ApiError(400, "Valid OTP is required for login.");
});


// get staff details
export const getStaffDetials = asyncHandler(async (req, res) => {
  const staffId = req.user?.id
  console.log("staff id from middleware", staffId)
  if (!staffId) throw new ApiError(401, "Not authorzed to access");
  const staffDetails = await doctorModel.findById(staffId)
  console.log("DEBUG: Staff Details fetched:", { id: staffDetails?._id, profileImage: staffDetails?.profileImage });
  return res.status(200).json(new ApiResponse(200, "Staff details", staffDetails))
})

// otp status check 
export const checkOtpStatus = asyncHandler(async (req, res) => {
  const { otpSessionId } = req.body
  console.log("this is the session id", otpSessionId)
  if (!otpSessionId) throw new ApiError(401, "No session found");

  const otpSession = await RedisClient.get(`otp:${otpSessionId}`)
  if (!otpSession) throw new ApiError(404, "Session exprired or invalid");

  const otpData = JSON.parse(otpSession)

  return res.status(200).json(new ApiResponse(200, "OTP session available", { otpSession }))
})

// register controller 
export const registerStaff = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  const parsed = doctorValidation.partial().safeParse(req.body);

  if (!parsed.success) {
    const errorDetails = parsed.error.format();
    console.error("Validation Error Details:", JSON.stringify(errorDetails, null, 2));

    // Extract a readable error message
    const firstError = Object.entries(errorDetails).find(([key, val]) => key !== '_errors');
    const message = firstError
      ? `Validation failed for: ${firstError[0]}`
      : "Validation failed! Please check all required fields.";

    throw new ApiError(400, message);
  }

  const findStaff = await doctorModel.findById(staffId);
  if (!findStaff) throw new ApiError(404, "Staff not found");

  // Build update object only with provided fields
  const updateData: any = {};
  const fields = [
    'name', 'email', 'gender', 'startExperience', 'specialization', 'about',
    'workingHours', 'serviceRadius', 'roleId', 'consultationFee', 'homeConsultationFee',
    'onlineConsultationFee', 'documents', 'status', 'bankDetails', 'profileImage',
    'city', 'address', 'location'
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // 🔄 Handle 'experience' (years) -> 'startExperience' (Date) mapping
  if (req.body.experience !== undefined) {
    const expYears = parseInt(String(req.body.experience));
    if (!isNaN(expYears)) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - expYears);
      updateData.startExperience = date;
    }
  }

  console.log("DEBUG: Final updateData:", JSON.stringify(updateData, null, 2));

  // If trying to go Active, check KYC and Subscription
  if (updateData.status === "Active") {
    // 1. KYC Check
    if (findStaff.status === "Pending") {
      throw new ApiError(403, "Authentication pending. Please wait for admin to verify your documents.");
    }

    // 2. Subscription Check (Optional: Allow for now but warn/restrict later)
    const activeSub = await PartnerSubscription.findOne({
      partnerId: staffId,
      status: "Active",
      endDate: { $gte: new Date() }
    });

    // IF we want to strictly enforce it:
    // if (!activeSub) throw new ApiError(403, "Active subscription required to go online.");
  }

  // Handle specific overrides if necessary
  if (req.body.isRegistered !== undefined) {
    updateData.isRegistered = req.body.isRegistered;
  } else if (!findStaff.isRegistered && req.body.name) {
    // If name is being set for the first time, maybe consider it partially registered
    updateData.isRegistered = true;
  }

  // 📧 Send Welcome Email if registration is becoming true
  if (!findStaff.isRegistered && updateData.isRegistered && (updateData.email || findStaff.email)) {
    sendPartnerWelcomeEmail({
      email: updateData.email || findStaff.email,
      fullName: updateData.name || findStaff.name || "Partner"
    }).catch(err => console.error("Welcome email failed:", err));
  }

  const updatedStaff = await doctorModel.findByIdAndUpdate(
    staffId,
    { $set: updateData },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, "Profile updated successfully", updatedStaff));
});

export const updateFcmToken = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  const { fcmToken } = req.body;
  if (!fcmToken) throw new ApiError(400, "FCM Token is required");

  await doctorModel.findByIdAndUpdate(staffId, { fcmToken });
  return res.status(200).json(new ApiResponse(200, "FCM Token updated successfully", {}));
});