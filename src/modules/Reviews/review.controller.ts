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

export const getAllReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 60, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = {};

    if (status && status !== "All") {
        query.status = status;
    }

    if (search && search !== "") {
        const s = new RegExp(search as string, 'i');
        const searchConditions: any[] = [
            { comment: s }
        ];

        // Search for matching users to include in the query
        const matchingUsers = await mongoose.model("Patient").find({
            $or: [
                { name: s },
                { mobileNumber: s }
            ]
        }).select("_id");

        if (matchingUsers.length > 0) {
            searchConditions.push({ userId: { $in: matchingUsers.map(u => u._id) } });
        }

        query.$or = searchConditions;
    }

    const total = await ReviewModel.countDocuments(query);
    const reviews = await ReviewModel.find(query)
        .populate("userId", "name mobileNumber profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    return res.status(200).json(new ApiResponse(200, "All reviews fetched", {
        items: reviews,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / (Number(limit) || 60))
    }));
});

export const updateReviewStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Hidden", "Pending"].includes(status)) {
        throw new ApiError(400, "Invalid status");
    }

    const review = await ReviewModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) throw new ApiError(404, "Review not found");

    return res.status(200).json(new ApiResponse(200, "Review status updated", review));
});
