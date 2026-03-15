import mongoose from "mongoose";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import serviceRequestModel from "./serviceRequest.model.js";
import serviceRequestValiation from "./serviceRequest.schema.js";
import { log } from "console";

export const createServiceRequest = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const payload = {
        ...req.body,
        userId,
    }

    const  checkServiceRequest = await serviceRequestModel.find({userId:new mongoose.Types.ObjectId(userId)})

    if(checkServiceRequest.length>2){
        throw new ApiError(401 , "To many service requests")
    }
    const parsed = serviceRequestValiation.safeParse(payload)
    if (!parsed.success) {
        console.error("Validation failed!", parsed.error)
        throw new ApiError(401, "Validation failed!")
    }

    const newServiceRequest = new serviceRequestModel(payload)
    await newServiceRequest.save()

    const serviceRequest = await serviceRequestModel.findById(newServiceRequest._id).populate("childServiceId")

    // socket and redis update for realtime updating

    return res.status(201).json(new ApiResponse(201, "Service booked", serviceRequest))
})

export const getServiceRequestByUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id


    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid userId format");
    }

    const serviceRequests = await serviceRequestModel.find({ userId }).populate("userId").populate("childServiceId")
    return res.status(200).json(new ApiResponse(200, "Got service", serviceRequests))
})

export const getPendingRequest = asyncHandler(async (req, res) => {
    console.log("this is runnign")
    const userId = req.user?.id

    const onGoingServices = await serviceRequestModel.find({
        userId: new mongoose.Types.ObjectId(userId), status: {
            $in: ["PENDING",
                "BROADCASTED",
                "ACCEPTED",
                "IN_PROGRESS",]
        }
    }).populate("childServiceId")

    return res.status(200).json(new ApiResponse(200, "Ongoing fetched!", onGoingServices))
})

export const getSerivceRequestById = asyncHandler(async (req  ,res)=>{
    const {requestId} = req.params
    
    if(!requestId) throw new ApiError(401 , "Please Provide request Id" )
    const requestDetails = await serviceRequestModel.findOne({_id:new mongoose.Types.ObjectId(requestId)})
    if(!requestDetails) throw new ApiError(404 , "Service request not found")
    
    return res.status(200).json(new ApiResponse(200 , "Request Found", requestDetails))
})