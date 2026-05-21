import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Service } from "./service.model.js";
import { SubService } from "./subService.model.js";
import { ChildServiceModel as ChildService } from "./childService.model.js";
import serviceValidation from "./service.schema.js";
import mongoose from "mongoose";

//create service 
export const createService = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    title: req.body.title,
    type: req.body.type,
    imageUrl: req.body.imageUrl,
    bannerUrl: req.body.bannerUrl || "",
    priority: req.body.priority !== undefined ? Number(req.body.priority) : 0
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
  const services = await Service.find().sort({ priority: 'asc', createdAt: 'asc' }).exec()
  res.status(200).json(new ApiResponse(200, "Services fetched", services))
})

//update service
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid Service ID");
  }

  const updateData: Record<string, any> = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.title) updateData.title = req.body.title;
  if (req.body.type) updateData.type = req.body.type;
  if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;
  if (req.body.bannerUrl) updateData.bannerUrl = req.body.bannerUrl;
  if (req.body.priority !== undefined) updateData.priority = Number(req.body.priority);

  const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });

  if (!updated) {
    throw new ApiError(404, "Service not found");
  }

  res.status(200).json(new ApiResponse(200, "Service updated", updated));
});

// bulk reorder — body: [{ id, priority }]
export const reorderServices = asyncHandler(async (req, res) => {
  const items: { id: string; priority: number }[] = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Expected array of { id, priority }");
  }
  await Promise.all(
    items.map(({ id, priority }) =>
      Service.findByIdAndUpdate(id, { priority })
    )
  );
  res.status(200).json(new ApiResponse(200, "Order saved", null));
});

//delete service
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid Service ID");
  }

  // Perform cascading delete
  await SubService.deleteMany({ serviceId: id });
  await ChildService.deleteMany({ serviceId: id });
  const deletedService = await Service.findByIdAndDelete(id);

  if (!deletedService) {
    throw new ApiError(404, "Service not found");
  }

  res.status(200).json(new ApiResponse(200, "Service and all associated sub-services/child-services deleted successfully", deletedService));
});