import RedisClient from "../../configs/redisConnect.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import doctorModel from "./doctor.model.js";
import doctorValidation from "./doctor.schema.js";
import PartnerSubscription from "../PartnerSubscription/subscription.model.js";
import jwt from "jsonwebtoken";
import { RoleModel } from "../roles/role.model.js";
import { sendPartnerWelcomeEmail } from "../../utils/email.js";
import { enqueueSms } from "../../queues/communicationQueue.js";
import { notifyAdmin } from "../Notifications/notification.controller.js";

const TEST_MOBILE_NUMBER = "8309470360";
const TEST_OTP = "123456";

const normalizeMobileNumber = (mobileNumber: string) =>
  String(mobileNumber || "")
    .replace(/^\+91/, "")
    .replace(/\D/g, "")
    .slice(-10);

const isTestOtpLogin = (mobileNumber: string, otp?: string | number) =>
  normalizeMobileNumber(mobileNumber) === TEST_MOBILE_NUMBER && String(otp) === TEST_OTP;

export const createDoctor = asyncHandler(async (req, res) => {
  const parsed = doctorValidation.safeParse({ ...req.body });
  if (!parsed.success) {
    console.error("Error in creating doctor", parsed.error);
    throw new ApiError(401, "Validation Falied!");
  }

  const newDoctor = new doctorModel(parsed.data);
  await newDoctor.save();
  return res.status(201).json(new ApiResponse(201, "Hurray..! Doctor created.", newDoctor));
});

export const getDoctorById = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const gotDoctor = await doctorModel.findById(doctorId);
  return res.status(200).json(new ApiResponse(200, "doctor found..", gotDoctor));
});

export const getStaffByRoleId = asyncHandler(async (req, res) => {
  const { roleId, specialization } = req.query;
  if (!roleId) throw new ApiError(404, "Role id is missing");

  const roleIds = String(roleId)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const query: any = {
    roleId: { $in: roleIds },
    status: "Active",
    name: { $exists: true, $type: "string", $ne: "" },
  };

  if (specialization) {
    query.specialization = { $in: [String(specialization).trim()] };
  }

  const staffDetails = await doctorModel.find(query).populate("roleId");
  return res.json(
    new ApiResponse(
      200,
      staffDetails.length ? "staff fetched successfully" : "No staff found for this specialization",
      staffDetails
    )
  );
});

export const sendOtpForStaff = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  const cleanMobile = normalizeMobileNumber(mobileNumber);
  if (!cleanMobile) {
    throw new ApiError(400, "Valid mobile number is required");
  }

  if (cleanMobile === TEST_MOBILE_NUMBER) {
    await RedisClient.setEx(`otp:staff:${cleanMobile}`, 600, TEST_OTP);
    return res.status(200).json(
      new ApiResponse(200, "OTP sent successfully", {
        mobileNumber: cleanMobile,
        otp: TEST_OTP,
      })
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await RedisClient.setEx(`otp:staff:${cleanMobile}`, 600, otp);

  console.log(`[Staff OTP] Enqueueing ${otp} for ${cleanMobile}`);
  await enqueueSms({ mobileNumber: cleanMobile, otp });

  return res.status(200).json(new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile }));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  console.log("[Partner Verify] Request Body:", req.body);
  const { mobileNumber, otp, roleId, role } = req.body;
  const cleanMobile = normalizeMobileNumber(mobileNumber);

  if (!cleanMobile) {
    throw new ApiError(400, "Mobile number is required");
  }

  let resolvedRoleId = roleId;
  if (!resolvedRoleId && role) {
    const foundRole =
      (await RoleModel.findOne({ code: String(role).toUpperCase() })) ||
      (await RoleModel.findOne({ name: new RegExp(String(role), "i") }));
    if (foundRole) resolvedRoleId = foundRole._id;
  }

  const loginWithMobile = async () => {
    let staff = await doctorModel
      .findOne({
        mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] },
      })
      .sort({ isRegistered: -1 });

    if (staff && staff.isDeleted) {
      const originalMobile = staff.mobileNumber;
      staff.mobileNumber = `${originalMobile}_deleted_${Date.now()}`;
      await staff.save();
      staff = null;
    }

    if (!staff) {
      staff = await doctorModel.create({
        mobileNumber: `+91${cleanMobile}`,
        roleId: resolvedRoleId || undefined,
        isRegistered: false,
      });
    }

    const token = jwt.sign({ staffId: staff._id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return res.status(200).json(new ApiResponse(200, "Login successful", { token, user: staff }));
  };

  if (isTestOtpLogin(cleanMobile, otp)) {
    console.log(`[OTP] ✅ Staff test OTP accepted for: ${cleanMobile}`);
    await RedisClient.del(`otp:staff:${cleanMobile}`).catch(() => undefined);
    return loginWithMobile();
  }

  if (otp && cleanMobile) {
    const storedOtp = await RedisClient.get(`otp:staff:${cleanMobile}`);
    if (storedOtp && String(storedOtp) === String(otp)) {
      console.log(`[OTP] ✅ Verified via Redis for: ${cleanMobile}`);
      await RedisClient.del(`otp:staff:${cleanMobile}`);
      return loginWithMobile();
    } else if (storedOtp) {
      throw new ApiError(400, "Invalid OTP provided.");
    }
  }

  throw new ApiError(400, "Valid OTP is required for login.");
});

export const getStaffDetials = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  console.log("staff id from middleware", staffId);
  if (!staffId) throw new ApiError(401, "Not authorzed to access");
  const staffDetails = await doctorModel.findById(staffId);
  console.log("DEBUG: Staff Details fetched:", { id: staffDetails?._id, profileImage: staffDetails?.profileImage });
  return res.status(200).json(new ApiResponse(200, "Staff details", staffDetails));
});

export const checkOtpStatus = asyncHandler(async (req, res) => {
  const { otpSessionId } = req.body;
  console.log("this is the session id", otpSessionId);
  if (!otpSessionId) throw new ApiError(401, "No session found");

  const otpSession = await RedisClient.get(`otp:${otpSessionId}`);
  if (!otpSession) throw new ApiError(404, "Session exprired or invalid");

  return res.status(200).json(new ApiResponse(200, "OTP session available", { otpSession }));
});

export const registerStaff = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  const parsed = doctorValidation.partial().safeParse(req.body);

  if (!parsed.success) {
    const errorDetails = parsed.error.format();
    console.error("Validation Error Details:", JSON.stringify(errorDetails, null, 2));

    const firstError = Object.entries(errorDetails).find(([key]) => key !== "_errors");
    const message = firstError
      ? `Validation failed for: ${firstError[0]}`
      : "Validation failed! Please check all required fields.";

    throw new ApiError(400, message);
  }

  const findStaff = await doctorModel.findById(staffId);
  if (!findStaff) throw new ApiError(404, "Staff not found");

  const updateData: any = {};
  const fields = [
    "name",
    "email",
    "gender",
    "startExperience",
    "specialization",
    "about",
    "workingHours",
    "serviceRadius",
    "roleId",
    "consultationFee",
    "homeConsultationFee",
    "onlineConsultationFee",
    "documents",
    "status",
    "bankDetails",
    "profileImage",
    "city",
    "address",
    "location",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (req.body.experience !== undefined) {
    const expYears = parseInt(String(req.body.experience));
    if (!isNaN(expYears)) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - expYears);
      updateData.startExperience = date;
    }
  }

  console.log("DEBUG: Final updateData:", JSON.stringify(updateData, null, 2));

  if (updateData.status === "Active") {
    if (findStaff.status === "Pending") {
      throw new ApiError(403, "Authentication pending. Please wait for admin to verify your documents.");
    }

    await PartnerSubscription.findOne({
      partnerId: staffId,
      status: "Active",
      endDate: { $gte: new Date() },
    });
  }

  if (req.body.isRegistered !== undefined) {
    updateData.isRegistered = req.body.isRegistered;
  } else if (!findStaff.isRegistered && req.body.name) {
    updateData.isRegistered = true;
  }

  if (!findStaff.isRegistered && updateData.isRegistered && (updateData.email || findStaff.email)) {
    sendPartnerWelcomeEmail({
      email: updateData.email || findStaff.email,
      fullName: updateData.name || findStaff.name || "Partner",
    }).catch((err) => console.error("Welcome email failed:", err));

    // ── Notify Admin ────────────────────────────────────────────────────────
    notifyAdmin(
      "📝 New KYC Application",
      `Partner ${updateData.name || findStaff.name} has submitted their credentials for review.`,
      "Partner",
      String(staffId)
    );
  }

  const updatedStaff = await doctorModel.findByIdAndUpdate(staffId, { $set: updateData }, { new: true });

  return res.status(200).json(new ApiResponse(200, "Profile updated successfully", updatedStaff));
});

export const updateFcmToken = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  const { fcmToken } = req.body;
  if (!fcmToken) throw new ApiError(400, "FCM Token is required");

  await doctorModel.findByIdAndUpdate(staffId, { fcmToken });
  return res.status(200).json(new ApiResponse(200, "FCM Token updated successfully", {}));
});

export const requestDeletionStaff = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  const staff = await doctorModel.findById(staffId);
  if (!staff) throw new ApiError(404, "Staff not found");

  if (staff.isDeleted) throw new ApiError(400, "Account already deleted");
  if (staff.deletionRequested) throw new ApiError(400, "Deletion request already pending approval");

  staff.deletionRequested = true;
  staff.deletionRequestedAt = new Date();
  await staff.save();

  // ── Notify Admin ────────────────────────────────────────────────────────
  notifyAdmin(
    "⚠️ Deletion Request",
    `Partner ${staff.name || staffId} has requested account deletion.`,
    "Partner",
    String(staffId)
  );

  res.status(200).json(new ApiResponse(200, "Deletion request submitted to admin for approval"));
});
