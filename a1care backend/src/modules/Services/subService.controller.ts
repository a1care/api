import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Service } from "./service.model.js";
import { SubService } from "./subService.model.js";
import { subServiceValidation } from "./subService.schema.js";

export const createSubService = asyncHandler(async (req, res) => {
    const serviceId = req.params.serviceId
    const payload = {
        name: req.body.name,
        description: req.body.description,
        serviceId: serviceId,
        imageUrl: req.fileUrl
    }

    const pared = subServiceValidation.safeParse(payload)
    if (!pared.success) {
        console.error("Error in creating subservice", pared.error)
        throw new ApiError(401, "Validation failed")
    }

    // finding service for subservice 
    const checkService = await Service.findById(pared.data.serviceId)
    if (!checkService) {
        throw new ApiError(404, "Service not found")
    }

    const newSubService = new SubService(payload)
    await newSubService.save()
    return res.status(201).json(new ApiResponse(201, "Sub service created", newSubService))
})

export const getServicesByServiceId = asyncHandler(async (req, res) => {
    const { serviceId } = req.params

    const subservice = await SubService.find({ serviceId: new mongoose.Types.ObjectId(serviceId) })
    return res.json(new ApiResponse(200, "subservice succesfully", subservice))

})

export const updateSubService = asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const body = req.body;

    const updateData: any = {
        name: body.name,
        description: body.description,
    };

    if (req.fileUrl) {
        updateData.imageUrl = req.fileUrl;
    }

    const updated = await SubService.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    );

    if (!updated) {
        throw new ApiError(404, "Sub-service not found");
    }

    return res.status(200).json(new ApiResponse(200, "Sub-service updated", updated));
});

export const deleteSubService = asyncHandler(async (req, res) => {
    const { id } = req.params
    const deleteService = await SubService.findByIdAndDelete(id)
    return res.status(200).json(new ApiResponse(200, "Deleted subservice", deleteService))
})