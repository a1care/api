import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { ChildServiceModel } from "./childService.model.js";
import { childServiceValidation } from "./childService.schema.js";


export const createChildService = asyncHandler(async (req, res) => {
    const { serviceId, subServiceId } = req.params
    console.log("this is request", req.body)
    const payload = {
        ...req.body,
        serviceId,
        subServiceId,
        imageUrl: req.fileUrl,
        price: Number(req.body.price)
    }

    const parsed = childServiceValidation.safeParse(payload);

    if (!parsed.success) {
        console.error("Error in creating child", parsed.error)
        throw new ApiError(401, "validation Failed")
    }

    const newChildService = new ChildServiceModel(payload)
    await newChildService.save()
    return res.status(201).json(new ApiResponse(201, "Child service created", newChildService))
})

export const getChildServiceBySubserviceId = asyncHandler(async (req, res) => {
    const { subServiceId } = req.params
    if (!subServiceId) throw new ApiError(404, "Subservice id is missing")

    const childServiceDetails = await ChildServiceModel.find({ subServiceId: subServiceId as any })
    return res.json(new ApiResponse(200, "child service is created", childServiceDetails))
})


// roles are specilization for the doctors 
export const addRolesToChildService = asyncHandler(async (req, res) => {
    const { roles } = req.query
    const { childServiceId } = req.params

    if (!childServiceId) throw new ApiError(401, "child service id not found")
    const roleIds = (roles as string).split(",")
    console.log(roleIds)
    const updatedChildService = await ChildServiceModel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(childServiceId) }, {
        $addToSet: { allowedRoleIds: { $each: roleIds } },
    }, {
        new: true
    })

    return res.status(200).json(new ApiResponse(200, "Child service updated", updatedChildService))
})

export const getChildServiceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Child service id is missing");

    const childService = await ChildServiceModel.findById(id);
    if (!childService) throw new ApiError(404, "Child service not found");

    return res.json(new ApiResponse(200, "Child service fetched", childService));
});

export const deleteChildService = asyncHandler(async (req, res) => {
    const { id } = req.params
    const deleted = await ChildServiceModel.findByIdAndDelete(id)
    return res.status(200).json(new ApiResponse(200, "Deleted Successfully", deleted))
})

export const getFeaturedChildServices = asyncHandler(async (req, res) => {
    // Fetch top 5 services based on rating and completion count
    const featured = await ChildServiceModel.find({ isActive: true })
        .sort({ rating: -1, completed: -1 })
        .limit(6);
        
    return res.json(new ApiResponse(200, "Featured child services fetched", featured));
});
