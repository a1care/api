import mongoose from "mongoose";
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

/** Total unread chat messages across all bookings the caller participates in. */
export const getUnreadChatCount = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const [serviceBookings, appts] = await Promise.all([
        serviceRequestModel.find({ $or: [{ userId }, { assignedProviderId: userId }] }).select("_id").lean(),
        doctorAppointmentModel.find({ $or: [{ patientId: userId }, { doctorId: userId }] }).select("_id").lean(),
    ]);

    const bookingIds = [
        ...serviceBookings.map((b: any) => b._id),
        ...appts.map((b: any) => b._id),
    ];

    const me = new mongoose.Types.ObjectId(userId);
    // One pass: per-booking unread counts (also gives the grand total). Used for the
    // home-bell badge AND per-card dots on the bookings tab.
    const grouped = await ChatMessage.aggregate([
        { $match: { bookingId: { $in: bookingIds }, senderId: { $ne: me }, readBy: { $ne: me } } },
        { $group: { _id: "$bookingId", count: { $sum: 1 } } },
    ]);

    const byBooking: Record<string, number> = {};
    let count = 0;
    for (const g of grouped) {
        byBooking[String(g._id)] = g.count;
        count += g.count;
    }

    return res.status(200).json(new ApiResponse(200, "Unread chat count", { count, byBooking }));
});

/** Mark all messages in a booking chat as read by the caller. */
export const markChatRead = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    if (!bookingId) throw new ApiError(400, "Booking ID Required");

    await assertBookingParticipant(bookingId, req.user?.id);

    await ChatMessage.updateMany(
        { bookingId, readBy: { $ne: req.user?.id } },
        { $push: { readBy: req.user?.id } }
    );
    return res.status(200).json(new ApiResponse(200, "Marked as read", null));
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
