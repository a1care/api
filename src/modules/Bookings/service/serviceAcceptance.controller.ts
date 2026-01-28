import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import serviceAcceptanceModal from "./serviceAcceptance.model.js";
import serviceAcceptanceValidation from "./serviceAcceptance.schema.js";
import serviceRequestModel from "./serviceRequest.model.js";

//create service acceptance 
export const  createServiceAcceptance = asyncHandler(async (req , res)=>{
    // plan the data for acceptance okay...
    // start from here 
    const {serviceRequestId , providerId}= req.params 
    const payload = {
        ...req.body , 
        serviceRequestId , 
        providerId
    }
    const parsed = serviceAcceptanceValidation.safeParse(payload)
    if(!parsed.success){
        console.error("Validation failed!" , parsed.error)
        throw new ApiError(401 , "Validation failed!")
    }
    const serviceRequestDetails = await serviceRequestModel.findById(serviceRequestId)
    if(serviceRequestDetails && serviceRequestDetails.status === "PENDING"){
        //update request status 
        await serviceRequestModel.findByIdAndUpdate(serviceRequestId , {$set:{
            status:"ACCEPTED"
        }}) 
        //create acceptance
        const newAccptance = new serviceAcceptanceModal(parsed.data)
        await newAccptance.save()
        return res.status(201).json(new ApiResponse(201 , "Accepted your service" ,newAccptance))

    }else{
        throw new ApiError(404 , "Service Request not found")
    }
})

//service acceptance by service request id 

//get service acceptance by service request id 

//get by provider id