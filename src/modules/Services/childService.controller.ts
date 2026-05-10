import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { ChildServiceModel } from "./childService.model.js";
import { childServiceValidation } from "./childService.schema.js";


export const createChildService = asyncHandler(async (req, res) => {
    const { serviceId, subServiceId } = req.params
    const payload = {
        ...req.body,
        serviceId,
        subServiceId,
        imageUrl: req.fileUrl,
        price: Number(req.body.price),
        selectionType: req.body.selectionType || req.body.bookingType || "SELECT",
        fulfillmentMode: req.body.fulfillmentMode || "HOME_VISIT"
    }

    const parsed = childServiceValidation.safeParse(payload);

    if (!parsed.success) {
        console.error("Error in creating child", parsed.error)
        throw new ApiError(400, "Validation failed")
    }

    const newChildService = new ChildServiceModel(parsed.data)
    await newChildService.save()
    return res.status(201).json(new ApiResponse(201, "Child service created", newChildService))
})

export const updateChildService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid child service id");
    }

    const updateData: Record<string, any> = {};
    if (typeof req.body.name === "string") updateData.name = req.body.name;
    if (typeof req.body.description === "string") updateData.description = req.body.description;
    if (req.body.price !== undefined) {
        const price = Number(req.body.price);
        if (!Number.isFinite(price) || price < 0) throw new ApiError(400, "Invalid price");
        updateData.price = price;
    }
    if (req.body.selectionType || req.body.bookingType) {
        const selectionType = req.body.selectionType || req.body.bookingType;
        if (!["SELECT", "ASSIGN"].includes(selectionType)) throw new ApiError(400, "Invalid selection type");
        updateData.selectionType = selectionType;
    }
    if (req.body.fulfillmentMode) {
        if (!["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"].includes(req.body.fulfillmentMode)) {
            throw new ApiError(400, "Invalid fulfillment mode");
        }
        updateData.fulfillmentMode = req.body.fulfillmentMode;
    }
    if (req.fileUrl) updateData.imageUrl = req.fileUrl;

    const updated = await ChildServiceModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new ApiError(404, "Child service not found");

    return res.status(200).json(new ApiResponse(200, "Child service updated", updated));
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
    // Step 1: Try to find admin-marked popular services
    let featured = await ChildServiceModel.find({ isActive: true, isFeatured: true })
        .sort({ rating: -1, completed: -1 })
        .limit(6);

    // Step 2: Fallback — if no services are admin-marked, use top-rated
    if (featured.length === 0) {
        featured = await ChildServiceModel.find({ isActive: true })
            .sort({ rating: -1, completed: -1 })
            .limit(6);
    }
        
    return res.json(new ApiResponse(200, "Featured child services fetched", featured));
});

export const toggleFeaturedChildService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Child service id is missing");

    const service = await ChildServiceModel.findById(id);
    if (!service) throw new ApiError(404, "Child service not found");

    service.isFeatured = !service.isFeatured;
    await service.save();

    return res.json(new ApiResponse(200, `Service marked as ${service.isFeatured ? 'popular' : 'not popular'}`, service));
});

export const updateChildService = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid ChildService ID");
    }

    const updateData: Record<string, any> = { ...req.body };
    
    if (req.body.price) updateData.price = Number(req.body.price);
    if (req.fileUrl) updateData.imageUrl = req.fileUrl;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;

    const updated = await ChildServiceModel.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
        throw new ApiError(404, "Child service not found");
    }

    return res.status(200).json(new ApiResponse(200, "Child service updated successfully", updated));
});
