import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import ReviewModel from "./review.model.js";
import DoctorModel from "../Doctors/doctor.model.js";
import { ChildServiceModel } from "../Services/childService.model.js";

export const addReview = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized");

    const {
        doctorId,
        childServiceId,
        bookingId,
        bookingType,
        rating,
        comment
    } = req.body;

    if (!bookingId || !bookingType || !rating) {
        throw new ApiError(400, "Missing required fields");
    }

    // Check if review already exists for this booking
    const existing = await ReviewModel.findOne({ bookingId, userId });
    if (existing) {
        throw new ApiError(400, "Review already submitted for this booking");
    }

    const review = await ReviewModel.create({
        userId,
        doctorId,
        childServiceId,
        bookingId,
        bookingType,
        rating,
        comment,
        status: "Active"
    });

    // Update Average Rating
    if (bookingType === "Doctor" && doctorId) {
        const stats = await ReviewModel.aggregate([
            { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: "Active" } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        if (stats.length > 0) {
            await DoctorModel.findByIdAndUpdate(doctorId, {
                rating: stats[0].avg,
                // We could also update 'completed' if we want, but usually that depends on booking status
            });
        }
    } else if (bookingType === "Service" && childServiceId) {
        // Similarly for childService if it has a rating field
        const stats = await ReviewModel.aggregate([
            { $match: { childServiceId: new mongoose.Types.ObjectId(childServiceId), status: "Active" } },
            { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        if (stats.length > 0) {
            await ChildServiceModel.findByIdAndUpdate(childServiceId, {
                rating: stats[0].avg,
            });
        }
    }

    return res.status(201).json(new ApiResponse(201, "Review added", review));
});

export const getDoctorReviews = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const reviews = await ReviewModel.find({ doctorId, status: "Active" })
        .populate("userId", "name profileImage")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, "Reviews fetched", reviews));
});

export const getServiceReviews = asyncHandler(async (req, res) => {
    const { childServiceId } = req.params;
    const reviews = await ReviewModel.find({ childServiceId, status: "Active" })
        .populate("userId", "name profileImage")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, "Reviews fetched", reviews));
});
