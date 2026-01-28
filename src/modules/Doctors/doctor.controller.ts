import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import doctorModel from "./doctor.model.js";
import doctorValidation from "./doctor.schema.js";

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