import RedisClient from "../../configs/redisConnect.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import generateOtp from "../../utils/generateOtp.js";
import doctorModel from "./doctor.model.js";
import doctorValidation from "./doctor.schema.js";
import jwt from 'jsonwebtoken'
//create doctor 
export const createDoctor = asyncHandler(async (req , res)=>{
    const payload = {
        ...req.body, 
        
    } 

    const parsed = doctorValidation.safeParse(payload)
    if(!parsed.success){
        console.error("Error in creating doctor" , parsed.error)
        throw new ApiError(401 , "Validation Falied!" )
    }

    const newDoctor = new doctorModel(payload)
    await newDoctor.save() 
    return res.status(201).json(new ApiResponse(201 , "Hurray..! Doctor created." , newDoctor))
})

//get doctor by id 
export const getDoctorById = asyncHandler(async (req , res)=>{
    const {doctorId} = req.params
    const gotDoctor = await doctorModel.findById(doctorId)
    return res.status(200).json(new ApiResponse(200 , "doctor found.." , gotDoctor))
})

//get the staff by role id
export const getStaffByRoleId = asyncHandler(async (req , res)=>{
    const {roleId} = req.query
    if(!roleId){
        throw new ApiError(404 , "Role id is missing")
    }
    const roleIds = (roleId as string).split(',').map(id => id.trim());
    console.log("role id is here.." ,)
    if(!roleId) throw new ApiError(404 , "Role id is missing")
    const staffDetails= await doctorModel.find({roleId:{$in:roleIds}}).populate('roleId')
    return res.json(new ApiResponse(200 , "staff fetched successfully" , staffDetails))
})

// send otp for staff 
export const sendOtpForStaff = asyncHandler(async (req ,res)=>{
    const {mobileNumber} = req.body 
    if(!mobileNumber) throw new ApiError(401 , "Mobile Number not found"); 

    const otp = generateOtp()
    
    // sms sending logic 

    await RedisClient.setEx(`otp:${mobileNumber}` , 300 , JSON.stringify(otp))
    return res.status(200).json(new ApiResponse(200 , "OTP sent to you mobile number..." , {otp}))

})

//verify otp for staff 
export const verifyOtp = asyncHandler(async (req , res)=>{
    const {mobileNumber , otp} = req.body

    if(!mobileNumber || !otp) throw new ApiError(401 , "Mobile numebr or otp not found");

    const redisOtp = await RedisClient.get(`otp:${mobileNumber}`)
    if(Number(otp)===Number(redisOtp)){
           let findUser = await doctorModel.findOne({mobileNumber})
           if(!findUser){
             findUser = new doctorModel({mobileNumber})
            await findUser.save()
           }

        const token = await jwt.sign({staffId:findUser._id} ,process.env.JWT_SECRET as string)
        console.log('this is the token that is generated for login' , token)
        return res.status(201).json(new ApiResponse(201 , "otp verified succesfully" , {token}))

    }
    else{
        throw new ApiError(401 , "Invalid otp!")
    }
        
})

// get staff details
export const getStaffDetials = asyncHandler(async (req , res)=>{
    const staffId = req.user?.id
    console.log("staff id from middleware" , staffId)
    if(!staffId) throw new ApiError(401 , "Not authorzed to access");
    const staffDetails = await doctorModel.findById(staffId)
    return res.status(200).json(new ApiResponse(200 , "Staff details"  , staffDetails ))
})

// otp status check 
