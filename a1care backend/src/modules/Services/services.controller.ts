import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Service } from "./service.model.js";
import serviceValidation from "./service.schema.js";
import mongoose from "mongoose";

//create service 
export const createService = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    title: req.body.title,
    type: req.body.type,
    imageUrl: req.fileUrl // injected by middleware
  };

  const parsed = serviceValidation.safeParse(payload);

  if (!parsed.success) {
    console.error('validation failed!', parsed.error)
    throw new ApiError(400, "Validation failed");
  }

  const newService = await Service.create(parsed.data);

  res.status(201).json({
    success: true,
    data: newService
  });
});


//get all service 
export const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find().sort({ createdAt: 'desc' }).exec()
  res.status(200).json(new ApiResponse(200, "Services fetched", services))
})

//update service
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existingService = await Service.findById(id);

  if (!existingService) {
    throw new ApiError(404, "Service not found");
  }

  const payload = {
    name: req.body.name || existingService.name,
    title: req.body.title || existingService.title,
    type: req.body.type || existingService.type,
    imageUrl: req.fileUrl || existingService.imageUrl,
    isActive: typeof req.body.isActive === 'string'
      ? req.body.isActive === 'true'
      : (req.body.isActive !== undefined ? req.body.isActive : existingService.isActive)
  };

  const parsed = serviceValidation.safeParse(payload);

  if (!parsed.success) {
    console.error('validation failed!', parsed.error);
    throw new ApiError(400, "Validation failed");
  }

  const updatedService = await Service.findByIdAndUpdate(
    id,
    { $set: parsed.data },
    { new: true }
  );

  res.status(200).json(new ApiResponse(200, "Service updated", updatedService));
});
//delete service
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params
  const deleteService = await Service.findByIdAndDelete(id)
  res.status(200).json(new ApiResponse(200, "Deleted Successfully", deleteService))
})