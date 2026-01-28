import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { ChildServiceModel } from "./childService.model.js";
import { childServiceValidation } from "./childService.schema.js";


export const createChildService = asyncHandler(async (req , res)=>{
    const {serviceId , subServiceId} = req.params
    console.log("this is request", req.body)
    const payload = {
        ...req.body ,
        serviceId, 
        subServiceId, 
        imageUrl:req.fileUrl
    }

    const parsed = childServiceValidation.safeParse(payload);

    if(!parsed.success){
        console.error("Error in creating child" , parsed.error)
        throw new ApiError(401 , "validation Failed")
    }

    const newChildService = new ChildServiceModel(payload)
    await newChildService.save()
    return res.status(201).json(new ApiResponse(201, "Child service created" , newChildService))
} )

export const getChildServiceBySubserviceId = asyncHandler(async (req , res)=>{
    const {subServiceId} = req.params 
    if(!subServiceId) throw new ApiError(404 , "Subservice id is missing")
    const childServiceDetails= await ChildServiceModel.find({subServiceId:subServiceId as any})
    return res.json(new ApiResponse(200 , "child service is created" , childServiceDetails))
})


// roles are specilization for the doctors 

