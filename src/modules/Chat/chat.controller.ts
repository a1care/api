import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import ChatMessage from "./chat.model.js";
import serviceRequestModel from "../Bookings/service/serviceRequest.model.js";
import doctorAppointmentModel from "../Bookings/doctorAppointment.model.js";

/** Verify the caller is a participant (patient or assigned provider) of the booking. */
export const assertBookingParticipant = async (bookingId: string, userId?: string) => {
    const sr: any = await serviceRequestModel.findById(bookingId).select("userId assignedProviderId");
    const appt: any = sr ? null : await doctorAppointmentModel.findById(bookingId).select("patientId doctorId");
    const doc = sr || appt;
    if (!doc) throw new ApiError(404, "Booking not found");
    const allowed = [
        String(doc.userId ?? doc.patientId ?? ""),
        String(doc.assignedProviderId ?? doc.doctorId ?? ""),
    ];
    if (!userId || !allowed.includes(String(userId))) {
        throw new ApiError(403, "Access denied");
    }
    return true;
};

export const getChatHistory = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!bookingId) throw new ApiError(400, "Booking ID Required");

    // Ownership: only a participant of this booking may read its private chat.
    await assertBookingParticipant(bookingId, req.user?.id);

    const history = await ChatMessage.find({ bookingId })
        .sort({ createdAt: 1 })
        .limit(100);

    return res.status(200).json(new ApiResponse(200, "Chat history fetched", history));
});

/**
 * REST fallback for sending a booking chat message (so messages aren't lost when the
 * socket is disconnected). Persists to the same ChatMessage store the socket uses,
 * with a server-derived sender identity. The client should still emit via socket for
 * real-time delivery, but this guarantees persistence.
 */
export const sendChatMessage = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { message, type = "text" } = req.body;
    if (!bookingId) throw new ApiError(400, "Booking ID Required");
    if (!message || !String(message).trim()) throw new ApiError(400, "Message is required");

    await assertBookingParticipant(bookingId, req.user?.id);

    const senderType = req.user?.role === "Patient" ? "Patient" : "Partner";
    const saved = await saveChatMessage({
        bookingId,
        senderId: req.user?.id,
        senderType,
        message,
        type,
    });
    if (!saved) throw new ApiError(500, "Failed to send message");

    return res.status(201).json(new ApiResponse(201, "Message sent", saved));
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
