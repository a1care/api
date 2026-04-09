import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import TicketModel from "./ticket.model.js";

export const createTicket = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    if (!staffId) throw new ApiError(401, "Not authorized to access");

    const { subject, description, priority } = req.body;
    if (!subject || !description) throw new ApiError(400, "Subject and description are required");

    const newTicket = await TicketModel.create({
        staffId: new mongoose.Types.ObjectId(staffId),
        subject,
        description,
        priority: ["Low", "Medium", "High", "Critical"].includes(priority) ? priority : "Medium"
    });

    return res.status(201).json(new ApiResponse(201, "Ticket created successfully", newTicket));
});

export const getMyTickets = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    if (!staffId) throw new ApiError(401, "Not authorized to access");

    const tickets = await TicketModel.find({ staffId }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "Your tickets", tickets));
});

export const createPatientTicket = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    console.log("[createPatientTicket] userId:", userId);
    console.log("[createPatientTicket] body:", req.body);

    if (!userId) throw new ApiError(401, "Not authorized to access");

    const { subject, description, priority } = req.body;
    if (!subject || !description) {
        console.error("[createPatientTicket] Validation failed: missing subject or description");
        throw new ApiError(400, "Subject and description are required");
    }

    try {
        const newTicket = await TicketModel.create({
            userId: new mongoose.Types.ObjectId(userId),
            subject,
            description,
            priority: ["Low", "Medium", "High", "Critical"].includes(priority) ? priority : "Medium"
        });
        console.log("[createPatientTicket] Ticket created:", newTicket._id);
        return res.status(201).json(new ApiResponse(201, "Ticket created successfully", newTicket));
    } catch (err) {
        console.error("[createPatientTicket] Database error:", err);
        throw new ApiError(500, "Could not save ticket to database");
    }
});

export const getMyPatientTickets = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized to access");

    const tickets = await TicketModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "Your tickets", tickets));
});

export const getAllTickets = asyncHandler(async (req, res) => {
    const tickets = await TicketModel.find().populate("staffId", "name mobileNumber status roleId").sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "All tickets", tickets));
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) throw new ApiError(400, "Status is required");

    const updatedTicket = await TicketModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    );

    if (!updatedTicket) throw new ApiError(404, "Ticket not found");

    return res.status(200).json(new ApiResponse(200, "Ticket status updated", updatedTicket));
});
