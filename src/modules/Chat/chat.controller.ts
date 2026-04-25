import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import ChatMessage from "./chat.model.js";

export const getChatHistory = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!bookingId) throw new ApiError(400, "Booking ID Required");

    const history = await ChatMessage.find({ bookingId })
        .sort({ createdAt: 1 })
        .limit(100);

    return res.status(200).json(new ApiResponse(200, "Chat history fetched", history));
});

export const saveChatMessage = async (data: any) => {
    try {
        const { bookingId, senderId, senderType, message, type = "text" } = data;
        const chat = await ChatMessage.create({
            bookingId,
            senderId,
            senderType,
            message,
            type
        });
        return chat;
    } catch (error) {
        console.error("Failed to save chat message", error);
        return null;
    }
};
