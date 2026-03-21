import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Location from "./location.model.js";

export const updateLocation = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { latitude, longitude, heading, speed, isOnline } = req.body;

    if (!userId) throw new ApiError(401, "Not authorized");

    const location = await Location.findOneAndUpdate(
        { userId },
        { 
            latitude, 
            longitude, 
            heading, 
            speed, 
            isOnline,
            userType: req.user?.role === 'Staff' ? 'Staff' : 'User'
        },
        { upsert: true, new: true }
    );

    return res.status(200).json(new ApiResponse(200, "Location updated", location));
});

export const getLocation = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const location = await Location.findOne({ userId });
    
    if (!location) {
        throw new ApiError(404, "Location not found for this user");
    }

    return res.status(200).json(new ApiResponse(200, "Location fetched", location));
});
