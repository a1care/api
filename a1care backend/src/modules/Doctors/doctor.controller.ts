import RedisClient from "../../configs/redisConnect.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import generateOtp from "../../utils/generateOtp.js";
import doctorModel from "./doctor.model.js";
import doctorValidation from "./doctor.schema.js";
import jwt from 'jsonwebtoken'
import { v1 as uuidv4 } from "uuid";
import { hmacHash } from "../../utils/Hmac.js";
import sendMessage from "../../configs/twilioConfig.js";
import mongoose from "mongoose";

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
  const query: any = { roleId: { $in: roleIds } };

  if (specialization) {
    query.specialization = { $in: [(specialization as string).trim()] };
  }

  const staffDetails = await doctorModel.find(query).populate('roleId')
  return res.json(new ApiResponse(200, staffDetails.length ? "staff fetched successfully" : "No staff found for this specialization", staffDetails))
})

// send otp for staff 
export const sendOtpForStaff = asyncHandler(async (req, res) => {
  // With Firebase, the frontend requests the OTP directly from Google!
  // We no longer need the backend to send Twilio messages.
  return res.status(200).json(
    new ApiResponse(200, "Please request OTP directly from Firebase in the App", {})
  );
});

//verify otp for staff 
export const verifyOtp = asyncHandler(async (req, res) => {
  const { idToken, mobileNumber } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Firebase ID token is required!");
  }

  try {
    // 1. Verify the secure Firebase Token
    const admin = (await import('../../configs/firebaseAdmin.js')).default;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 2. Extract the verified phone number from Google
    const firebasePhone = decodedToken.phone_number || mobileNumber;

    // 3. Find or create the staff in the database
    let staff = await doctorModel.findOne({ mobileNumber: firebasePhone });
    if (!staff) {
      staff = await doctorModel.create({ mobileNumber: firebasePhone });
    }

    // 4. Generate the JWT Token for the rest of the app
    const token = jwt.sign(
      { staffId: staff._id },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.status(200).json(
      new ApiResponse(200, "Firebase Verification successful", { token })
    );

  } catch (error) {
    console.error("Firebase Token Error:", error);
    throw new ApiError(401, "Invalid or expired Firebase Token!");
  }
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
    console.error("Validation Error Details:", JSON.stringify(parsed.error.format(), null, 2));
    throw new ApiError(400, "Validation failed!");
  }

  const findStaff = await doctorModel.findById(staffId);
  if (!findStaff) throw new ApiError(404, "Staff not found");

  // Build update object only with provided fields
  const updateData: any = {};
  const fields = [
    'name', 'gender', 'startExperience', 'specialization', 'about',
    'workingHours', 'serviceRadius', 'roleId', 'consultationFee', 'homeConsultationFee',
    'onlineConsultationFee', 'documents', 'status', 'bankDetails', 'profileImage'
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  console.log("DEBUG: Final updateData:", JSON.stringify(updateData, null, 2));

  // Handle specific overrides if necessary
  if (req.body.isRegistered !== undefined) {
    updateData.isRegistered = req.body.isRegistered;
  } else if (!findStaff.isRegistered && req.body.name) {
    // If name is being set for the first time, maybe consider it partially registered
    updateData.isRegistered = true;
  }

  const updatedStaff = await doctorModel.findByIdAndUpdate(
    staffId,
    { $set: updateData },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, "Profile updated successfully", updatedStaff));
});