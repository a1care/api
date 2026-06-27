import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Message from "./message.model.js";
import Ticket from "./ticket.model.js";
import Appointment from "../Bookings/doctorAppointment.model.js";
import serviceRequestModel from "../Bookings/service/serviceRequest.model.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import { getMessaging } from "../../configs/fcmConfig.js";

export const getMessagesByTicket = asyncHandler(async (req, res) => {
    const ticketId = (req.params.ticketId || req.query.ticketId) as string | undefined;
    const bookingId = req.query.bookingId as string | undefined;
    const userId = req.user?.id;
    const role = req.user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Ownership: only a participant of the ticket/booking may read the thread (admins bypass).
    if (ticketId) {
        const ticket = await Ticket.findById(ticketId).select("staffId userId").lean();
        if (!ticket) throw new ApiError(404, "Ticket not found");
        if (!isAdmin) {
            const allowed = [String(ticket.staffId || ""), String(ticket.userId || "")].filter(Boolean);
            if (!allowed.includes(String(userId))) throw new ApiError(403, "Access denied");
        }
    } else if (bookingId) {
        const appt: any = await Appointment.findById(bookingId).select("patientId doctorId").lean();
        const sr: any = appt ? null : await serviceRequestModel.findById(bookingId).select("userId assignedProviderId").lean();
        const doc = appt || sr;
        if (!doc) throw new ApiError(404, "Booking not found");
        if (!isAdmin) {
            const allowed = [
                String(doc.patientId || doc.userId || ""),
                String(doc.doctorId || doc.assignedProviderId || ""),
            ].filter(Boolean);
            if (!allowed.includes(String(userId))) throw new ApiError(403, "Access denied");
        }
    } else {
        throw new ApiError(400, "ticketId or bookingId is required");
    }

    const filter = ticketId ? { ticketId } : { bookingId };
    const messages = await Message.find(filter).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, "Messages fetched", messages));
});

export const sendMessage = asyncHandler(async (req, res) => {
    const { ticketId, bookingId, message, attachments } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    // Sender identity is derived from the verified JWT.
    // 'Staff' = Partner app, 'User' = Patient app, 'Admin' = admin panel.
    const senderType: 'User' | 'Staff' | 'Admin' = (role === 'Staff' || role === 'admin' || role === 'super_admin') ? (role === 'Staff' ? 'Staff' : 'Admin') : 'User';

    let recipientId: string | undefined;
    let title = "New Message";

    if (ticketId) {
        const ticket = await Ticket.findById(ticketId).lean();
        if (!ticket) throw new ApiError(404, "Ticket not found");
        // Push to ticket creator (partner/patient) when admin replies; no push going the other way.
        const creatorId = String((ticket as any).userId || "");
        recipientId = senderType === 'Admin' && creatorId ? creatorId : undefined;
        title = `Support: ${(ticket as any).subject}`;
    } else if (bookingId) {
        const appointment = await Appointment.findById(bookingId).lean();
        if (!appointment) throw new ApiError(404, "Appointment not found");
        // Notify the other participant.
        recipientId = (senderType === 'Staff') ? appointment.patientId?.toString() : appointment.doctorId?.toString();
        title = `Chat: ${appointment.startingTime}`;
    }

    const newMessage = await Message.create({
        ticketId,
        bookingId,
        message,
        attachments,
        senderId: userId,
        senderType,
        readBy: [userId]
    });

    // Send Push Notification
    try {
        if (recipientId) {
            // Determine recipient model
            let recipient: any = null;
            if (ticketId) {
                const ticket = await Ticket.findById(ticketId).lean();
                if (ticket?.staffId && String(ticket.staffId) === recipientId) {
                    recipient = await Doctor.findById(recipientId);
                } else {
                    recipient = await Patient.findById(recipientId);
                }
            } else if (bookingId) {
                const appointment = await Appointment.findById(bookingId).lean();
                if (appointment?.doctorId && String(appointment.doctorId) === recipientId) {
                    recipient = await Doctor.findById(recipientId);
                } else {
                    recipient = await Patient.findById(recipientId);
                }
            }
            
            if (recipient?.fcmToken) {
                const messaging = getMessaging();
                if (messaging) {
                    messaging.send({
                        notification: {
                            title: title,
                            body: message.slice(0, 100),
                        },
                        data: {
                            threadId: (ticketId || bookingId) as string,
                            type: ticketId ? "TICKET_CHAT" : "BOOKING_CHAT"
                        },
                        token: recipient.fcmToken,
                    });
                }
            }
        }
    } catch (err) {
        console.error("Push notification failed", err);
    }

    return res.status(201).json(new ApiResponse(201, "Message sent", newMessage));
});
