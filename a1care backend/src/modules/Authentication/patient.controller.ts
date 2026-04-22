import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "./patient.model.js";
import { patientValidation } from "./patient.schema.js";
import mongoose from "mongoose";
import { enqueueEmail, enqueueSms } from "../../queues/communicationQueue.js";
import { formatZodError } from "../../utils/formatZodError.js";
import RedisClient from "../../configs/redisConnect.js";

const TEST_MOBILE_NUMBER = "8309470360";
const TEST_OTP = "123456";

const normalizeMobileNumber = (mobileNumber: string) =>
  String(mobileNumber || "")
    .replace(/^\+91/, "")
    .replace(/\D/g, "")
    .slice(-10);

const isTestOtpLogin = (mobileNumber: string, otp?: string | number) =>
  normalizeMobileNumber(mobileNumber) === TEST_MOBILE_NUMBER && String(otp) === TEST_OTP;

export const getPatientDetailsById = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;

  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database unavailable");
  }

  const userDetails = await Patient.findById(patientId).populate("primaryAddressId");

  if (userDetails) return res.status(200).json(new ApiResponse(200, "data fetched", userDetails));
  throw new ApiError(404, "No user found");
});

export const sentOtpForPatient = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  const cleanMobile = normalizeMobileNumber(mobileNumber);

  if (!cleanMobile) {
    throw new ApiError(400, "Valid mobile number is required");
  }

  if (cleanMobile === TEST_MOBILE_NUMBER) {
    await RedisClient.setEx(`otp:patient:${cleanMobile}`, 600, TEST_OTP);
    return res.status(200).json(
      new ApiResponse(200, "OTP sent successfully", {
        mobileNumber: cleanMobile,
        otp: TEST_OTP,
      })
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await RedisClient.setEx(`otp:patient:${cleanMobile}`, 600, otp);

  console.log(`[Patient OTP] Enqueueing ${otp} for ${cleanMobile}`);
  await enqueueSms({ mobileNumber: cleanMobile, otp });

  return res.status(200).json(
    new ApiResponse(200, "OTP sent successfully", { mobileNumber: cleanMobile })
  );
});

export const verifyOtpForPatient = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body;
  const cleanMobile = normalizeMobileNumber(mobileNumber);

  if (!cleanMobile) {
    throw new ApiError(400, "Mobile number is required");
  }

  if (isTestOtpLogin(cleanMobile, otp)) {
    console.log(`[OTP] Patient test OTP accepted for: ${cleanMobile}`);
    await RedisClient.del(`otp:patient:${cleanMobile}`).catch(() => undefined);

    let patient = await Patient.findOne({
      mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] },
    });

    if (patient && patient.isDeleted) {
      const originalMobile = patient.mobileNumber;
      patient.mobileNumber = `${originalMobile}_deleted_${Date.now()}`;
      await patient.save();
      patient = null;
    }

    const isTestAccount = cleanMobile === TEST_MOBILE_NUMBER;

    if (!patient) {
      patient = new Patient({ 
        mobileNumber: `+91${cleanMobile}`,
        isRegistered: isTestAccount,
        name: isTestAccount ? "Google Reviewer" : undefined
      });
      await patient.save();
    } else if (isTestAccount && !patient.isRegistered) {
      patient.isRegistered = true;
      patient.name = patient.name || "Google Reviewer";
      await patient.save();
    }

    const token = jwt.sign(
      { mobileNumber: patient.mobileNumber, userId: patient._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.status(200).json(new ApiResponse(200, "Verification successful", { token }));
  }

  if (otp && cleanMobile) {
    const storedOtp = await RedisClient.get(`otp:patient:${cleanMobile}`);
    if (storedOtp && String(storedOtp) === String(otp)) {
      console.log(`[OTP] Patient verified via Redis for: ${cleanMobile}`);

      await RedisClient.del(`otp:patient:${cleanMobile}`);

      let patient = await Patient.findOne({
        mobileNumber: { $in: [cleanMobile, `+91${cleanMobile}`] },
      });
      if (patient && patient.isDeleted) {
        const originalMobile = patient.mobileNumber;
        patient.mobileNumber = `${originalMobile}_deleted_${Date.now()}`;
        await patient.save();
        patient = null;
      }

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

  throw new ApiError(400, "Valid OTP is required for login.");
});

export const updateProfile = asyncHandler(async (req, res) => {
  console.log("this is the body we are getting..", req.body);
  const parsed = patientValidation.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, formatZodError(parsed.error));
  }

  const patientId = req.user?.id;
  console.log("[UpdateProfile] Patient ID:", patientId, "Parsed Data:", parsed.data);

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
        isRegistered: true,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedPatient) {
    throw new ApiError(404, "Patient not found");
  }

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

  res.status(200).json({
    success: true,
    data: updatedPatient,
  });
});

export const requestDeletion = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, "Patient not found");

  if (patient.isDeleted) throw new ApiError(400, "Account already deleted");
  if (patient.deletionRequested) throw new ApiError(400, "Deletion request already pending approval");

  patient.deletionRequested = true;
  patient.deletionRequestedAt = new Date();
  await patient.save();

  res.status(200).json(new ApiResponse(200, "Deletion request submitted to admin for approval"));
});
