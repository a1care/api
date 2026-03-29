import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Message from "./message.model.js";
import Ticket from "./ticket.model.js";
import Appointment from "../Bookings/doctorAppointment.model.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import { getMessaging } from "../../configs/fcmConfig.js";

export const getMessagesByTicket = asyncHandler(async (req, res) => {
    const { ticketId, bookingId } = req.query;
    const filter = ticketId ? { ticketId } : { bookingId };
    const messages = await Message.find(filter).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, "Messages fetched", messages));
});

export const sendMessage = asyncHandler(async (req, res) => {
    const { ticketId, bookingId, message, attachments } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;
    
    // Determine the sender type for DB storage
    // 'Staff' means the message came from the Partner app
    // 'User' means it came from the Patient app OR Admin Panel (from the other perspective)
    let senderType: 'User' | 'Staff' = (role === 'admin' || role === 'super_admin' || !role) ? 'User' : 'Staff';

    let recipientId: string | undefined;
    let title = "New Message";

    if (ticketId) {
        const ticket = await Ticket.findById(ticketId).lean();
        if (!ticket) throw new ApiError(404, "Ticket not found");
        
        // If an admin is sending, the recipient is whoever is attached to the ticket
        if (role === 'admin' || role === 'super_admin') {
            recipientId = ticket.staffId?.toString() || ticket.userId?.toString();
            senderType = 'User'; // Admin is responding as the "system/other"
        } else {
            // If a partner is sending, they want to message the admin (not handled here, admin checks inbox)
            // or the patient (if bookingId). For tickets, partners just post to the thread.
            recipientId = undefined; // Tickets are usually Partner <-> Admin
        }
        title = `Support: ${ticket.subject}`;
    } else if (bookingId) {
        const appointment = await Appointment.findById(bookingId).lean();
        if (!appointment) throw new ApiError(404, "Appointment not found");
        
        if (role === 'admin' || role === 'super_admin') {
            // Admin intervened in a booking chat
            recipientId = appointment.patientId?.toString(); // default to patient for now
        } else {
            recipientId = (senderType === 'Staff') ? appointment.patientId?.toString() : appointment.doctorId?.toString();
        }
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
                    await messaging.send({
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
