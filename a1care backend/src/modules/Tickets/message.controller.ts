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
    const userRole = req.user?.role || (req.body.senderType === 'Staff' ? 'Staff' : 'User');

    let recipientId: string | undefined;
    let title = "New Message";

    if (ticketId) {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) throw new ApiError(404, "Ticket not found");
        recipientId = (userRole === 'Staff') ? ticket.userId?.toString() : ticket.staffId?.toString();
        title = `Ticket: ${ticket.subject}`;
    } else if (bookingId) {
        const appointment = await Appointment.findById(bookingId);
        if (!appointment) throw new ApiError(404, "Appointment not found");
        recipientId = (userRole === 'Staff') ? appointment.patientId?.toString() : appointment.doctorId?.toString();
        title = `Appointment: ${appointment.startingTime}`;
    }

    const newMessage = await Message.create({
        ticketId,
        bookingId,
        message,
        attachments,
        senderId: userId,
        senderType: userRole === 'Staff' ? 'Staff' : 'User',
        readBy: [userId]
    });

    // Send Push Notification
    try {
        if (recipientId) {
            const recipient = (userRole === 'Staff') 
                ? await Patient.findById(recipientId) 
                : await Doctor.findById(recipientId);
            
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
