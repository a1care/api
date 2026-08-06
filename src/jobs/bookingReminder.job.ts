import cron from "node-cron";
import serviceRequestModel from "../modules/Bookings/service/serviceRequest.model.js";
import doctorAppointmentModel from "../modules/Bookings/doctorAppointment.model.js";
import mongoose from "mongoose";
import { enqueuePush } from "../queues/communicationQueue.js";

export const initBookingReminderJob = () => {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        if (mongoose.connection.readyState !== 1) return;
        
        try {
            const now = new Date();
            // Look for bookings starting between 115 mins and 120 mins from now
            const startWindow = new Date(now.getTime() + 115 * 60000);
            const endWindow = new Date(now.getTime() + 120 * 60000);

            // 1. Service Requests
            const upcomingServices = await serviceRequestModel.find({
                status: { $in: ["ACCEPTED", "PARTNER_ASSIGNED"] },
                "scheduledSlot.startTime": { $gte: startWindow, $lt: endWindow }
            }).populate("assignedProviderId", "fcmToken").lean();

            for (const svc of upcomingServices) {
                const partner = svc.assignedProviderId as any;
                if (partner && partner.fcmToken) {
                    await enqueuePush({
                        recipientId: partner._id,
                        recipientType: "partner",
                        fcmToken: partner.fcmToken,
                        title: "?? Upcoming Booking in 2 Hours!",
                        body: "Your scheduled service is coming up soon. Please get ready to navigate.",
                        data: { screen: `/bookings`, type: "REMINDER", bookingId: String(svc._id) },
                    });
                }
            }

            // 2. Doctor Appointments
            const upcomingAppointments = await doctorAppointmentModel.find({
                status: "Confirmed",
                date: { $gte: startWindow, $lt: endWindow }
            }).populate("doctorId", "fcmToken").lean();

            for (const appt of upcomingAppointments) {
                const doctor = appt.doctorId as any;
                if (doctor && doctor.fcmToken) {
                    await enqueuePush({
                        recipientId: doctor._id,
                        recipientType: "partner",
                        fcmToken: doctor.fcmToken,
                        title: "?? Upcoming Appointment in 2 Hours!",
                        body: "Your scheduled consultation is coming up soon. Please get ready.",
                        data: { screen: `/bookings`, type: "REMINDER", bookingId: String(appt._id) },
                    });
                }
            }
        } catch (error) {
            console.error("[Cron] Error in bookingReminderJob:", error);
        }
    });

    // Run every day at 8:00 AM to remind patients of today's OP Hospital Visits
    cron.schedule("0 8 * * *", async () => {
        if (mongoose.connection.readyState !== 1) return;
        
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const todaysOpBookings = await serviceRequestModel.find({
                status: "ACCEPTED",
                fulfillmentMode: "HOSPITAL_VISIT",
                "scheduledSlot.startTime": { $gte: todayStart, $lte: todayEnd }
            }).populate("userId", "fcmToken").lean();

            for (const svc of todaysOpBookings) {
                const patient = svc.userId as any;
                if (patient && patient.fcmToken) {
                    await enqueuePush({
                        recipientId: patient._id,
                        recipientType: "patient",
                        fcmToken: patient.fcmToken,
                        title: "?? Today is your Hospital Visit",
                        body: `Friendly reminder! Your OP token for today is confirmed. Please arrive on time.`,
                        data: { screen: `/bookings`, type: "REMINDER", bookingId: String(svc._id) },
                    });
                }
            }
        } catch (error) {
            console.error("[Cron] Error in OP morning reminder:", error);
        }
    });
};
