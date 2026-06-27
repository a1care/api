import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import TicketModel from "./ticket.model.js";
import { notifyAdmin } from "../Notifications/notification.controller.js";
import { escapeRegex } from "../../utils/escapeRegex.js";
import { enqueueEmail, enqueuePush } from "../../queues/communicationQueue.js";
import DoctorModel from "../Doctors/doctor.model.js";
import { Patient } from "../Authentication/patient.model.js";

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

    await notifyAdmin(
        "🎫 New Support Ticket",
        `A partner raised a ticket: "${subject}"`,
        "Ticket",
        String(newTicket._id)
    );

    const partner = await DoctorModel.findById(staffId).select("email name").lean();
    if (partner?.email) {
        enqueueEmail({
            kind: "ticket_receipt",
            data: {
                email: partner.email,
                fullName: partner.name || "Partner",
                subject,
                ticketId: String(newTicket._id).slice(-8).toUpperCase(),
                priority: newTicket.priority,
            },
        }).catch(() => {});
    }

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
    if (!userId) throw new ApiError(401, "Not authorized to access");

    const { subject, description, priority } = req.body;
    if (!subject || !description) throw new ApiError(400, "Subject and description are required");

    const newTicket = await TicketModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        subject,
        description,
        priority: ["Low", "Medium", "High", "Critical"].includes(priority) ? priority : "Medium"
    });

    await notifyAdmin(
        "🎫 New Support Ticket",
        `A customer raised a ticket: "${subject}"`,
        "Ticket",
        String(newTicket._id)
    );

    const patient = await Patient.findById(userId).select("email name").lean();
    if (patient?.email) {
        enqueueEmail({
            kind: "ticket_receipt",
            data: {
                email: patient.email,
                fullName: patient.name || "Customer",
                subject,
                ticketId: String(newTicket._id).slice(-8).toUpperCase(),
                priority: newTicket.priority,
            },
        }).catch(() => {});
    }

    return res.status(201).json(new ApiResponse(201, "Ticket created successfully", newTicket));
});

export const getMyPatientTickets = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized to access");

    const tickets = await TicketModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "Your tickets", tickets));
});

export const getAllTickets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = {};

    if (status && status !== "All") {
        query.status = status;
    }

    if (search && search !== "") {
        const s = new RegExp(escapeRegex(search), 'i');
        const searchConditions: any[] = [
            { subject: s },
            { description: s }
        ];

        // Search for matching staff/users to include in the query
        const matchingStaff = await mongoose.model("Doctor").find({
            $or: [
                { name: s },
                { mobileNumber: s }
            ]
        }).select("_id");

        const matchingPatients = await mongoose.model("Patient").find({
            $or: [
                { name: s },
                { mobileNumber: s }
            ]
        }).select("_id");

        if (matchingStaff.length > 0) {
            searchConditions.push({ staffId: { $in: matchingStaff.map(s => s._id) } });
        }
        if (matchingPatients.length > 0) {
            searchConditions.push({ userId: { $in: matchingPatients.map(p => p._id) } });
        }

        query.$or = searchConditions;
    }

    const total = await TicketModel.countDocuments(query);
    const tickets = await TicketModel.find(query)
        .populate("staffId", "name mobileNumber status roleId")
        .populate("userId", "name mobileNumber profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    return res.status(200).json(new ApiResponse(200, "All tickets fetched", {
        items: tickets,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / (Number(limit) || 50))
    }));
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

    // Notify the ticket creator when ticket is resolved or closed
    if (status === "Resolved" || status === "Closed") {
        const ticketId = String(updatedTicket._id).slice(-8).toUpperCase();
        const pushTitle = status === "Resolved" ? "Ticket Resolved ✅" : "Ticket Closed";
        const pushBody = `Your support ticket #${ticketId} has been ${status.toLowerCase()}.`;

        if (updatedTicket.staffId) {
            const partner = await DoctorModel.findById(updatedTicket.staffId).select("fcmToken email name").lean();
            if (partner) {
                enqueuePush({
                    recipientId: updatedTicket.staffId as mongoose.Types.ObjectId,
                    recipientType: "partner",
                    fcmToken: (partner as any).fcmToken ?? null,
                    title: pushTitle,
                    body: pushBody,
                    data: { screen: `/ticket/${id}` },
                    refType: "Ticket",
                    refId: new mongoose.Types.ObjectId(id),
                }).catch(() => {});
            }
        } else if (updatedTicket.userId) {
            const patient = await Patient.findById(updatedTicket.userId).select("fcmToken email name").lean();
            if (patient) {
                enqueuePush({
                    recipientId: updatedTicket.userId as mongoose.Types.ObjectId,
                    recipientType: "patient",
                    fcmToken: (patient as any).fcmToken ?? null,
                    title: pushTitle,
                    body: pushBody,
                    data: { screen: `/ticket/${id}` },
                    refType: "Ticket",
                    refId: new mongoose.Types.ObjectId(id),
                }).catch(() => {});
            }
        }
    }

    return res.status(200).json(new ApiResponse(200, "Ticket status updated", updatedTicket));
});
