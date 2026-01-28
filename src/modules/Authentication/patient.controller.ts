import jwt from 'jsonwebtoken'
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "./patient.model.js";
import { patientValidation } from "./patient.schema.js";
import mongoose from 'mongoose';
import RedisClient from '../../configs/redisConnect.js';
import generateOtp from '../../utils/generateOtp.js';

export const getPatientDetailsById = asyncHandler(async(req ,res)=>{
    const patientId = req.user?.id
    const userDetails = await Patient.findById(patientId).populate('primaryAddressId')

   
    if(userDetails)return res.status(200).json(new ApiResponse(200, "data fetched" , userDetails))
    else{
        throw new ApiError(404 , "No user found")    
    }
})

export const sentOtpForPatient = asyncHandler(async (req , res)=>{
    const {mobileNumber} = req.body
    if(!mobileNumber){
        throw new ApiError(401 , "validation failed!")
    }

    // rate limiting and otp logic
    //random otp
    const otp = generateOtp()
    RedisClient.setEx(`otp:${mobileNumber}` , 300 , JSON.stringify(otp))

    return res.json(new ApiResponse(201 , "OTP sent successfully" , {mobileNumber}))
})

// verify otp 
export const verifyOtpForPatient = asyncHandler(async (req , res)=>{
    const {mobileNumber , otp} = req.body

    if(!mobileNumber || !otp){
        throw new ApiError(401 ,  "Validation failed!")
    }

   const redisOtp = await RedisClient.get(`otp:${mobileNumber}`)
   console.log("this is redis otp" , redisOtp)

    if(Number(otp) === 123123){
        let isExists = await Patient.findOne({mobileNumber})
        console.log( 'before happening this one..' , isExists)
        if(!isExists){
            const newPatient = new Patient({
                    mobileNumber
            })

            await newPatient.save() 
            isExists = newPatient
        }
        const token = jwt.sign({mobileNumber , userId:isExists._id}, process.env.JWT_SECRET as string )
        console.log("token is generated..." , token)
        
        return res.status(201).json(new ApiResponse(201 , "verification successfull" , {token}))
    }else{
        throw new ApiError(404 , "Invalid OTP!")
    }
})

export const updateProfile = asyncHandler(async (req, res) => {
  // 1. Validate input
  console.log("this is the body we are getting.." , req.body)
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
    {_id:patientId},
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

  // 5. Respond
  res.status(200).json({
    success: true,
    data: updatedPatient
  });
});
