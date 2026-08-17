import cron from "node-cron";
import mongoose from "mongoose";
import serviceRequestModel from "../modules/Bookings/service/serviceRequest.model.js";
import { notifyAdmin } from "../modules/Notifications/notification.controller.js";
import { enqueuePush } from "../queues/communicationQueue.js";
import { Patient } from "../modules/Authentication/patient.model.js";

export const initBookingHealthCheckJob = () => {
    // Every 10 minutes: recover stuck pre-acceptance bookings and flag overdue IN_PROGRESS
    cron.schedule("*/10 * * * *", async () => {
        if (mongoose.connection.readyState !== 1) return;

        try {
            const now = new Date();

            // ── 1. Backstop: BROADCASTED bookings older than 5 min with no partner ──
            const stuckBroadcasted = await serviceRequestModel.find({
                status: "BROADCASTED",
                updatedAt: { $lt: new Date(now.getTime() - 5 * 60 * 1000) },
            }).select("_id userId").lean();

            for (const b of stuckBroadcasted) {
                await serviceRequestModel.findByIdAndUpdate(b._id, { status: "RETURNED_TO_ADMIN" });
                await notifyAdmin(
                    "⏰ Broadcast Expired (Backstop)",
                    `Booking #${String(b._id).slice(-6).toUpperCase()} found stuck BROADCASTED — returned to admin by cron.`,
                    "ServiceRequest",
                    String(b._id)
                );
                try {
                    const patient = await Patient.findById(b.userId).select("fcmToken");
                    if (patient) {
                        await enqueuePush({
                            recipientId: patient._id as any,
                            recipientType: "patient",
                            fcmToken: (patient as any).fcmToken ?? undefined,
                            title: "🔄 Still Finding Your Partner",
                            body: "We're still searching for a partner. Our team will assign one shortly.",
                            data: { screen: `/booking/${String(b._id)}` },
                            refType: "ServiceRequest",
                            refId: b._id as any,
                        });
                    }
                } catch { /* non-fatal */ }
            }

            // ── 2. Backstop: PARTNER_ASSIGNED bookings past deadline ──
            const stuckAssigned = await serviceRequestModel.find({
                status: "PARTNER_ASSIGNED",
                acceptanceDeadline: { $lt: now },
            }).select("_id userId assignedProviderId").lean();

            for (const b of stuckAssigned) {
                await serviceRequestModel.findByIdAndUpdate(b._id, {
                    status: "PENDING",
                    assignedProviderId: null,
                    assignedRoleId: null,
                    acceptanceDeadline: null,
                });
                await notifyAdmin(
                    "⚠️ Acceptance Timeout (Backstop)",
                    `Booking #${String(b._id).slice(-6).toUpperCase()} partner did not accept within deadline — reset to PENDING by cron.`,
                    "ServiceRequest",
                    String(b._id)
                );
                try {
                    const patient = await Patient.findById(b.userId).select("fcmToken");
                    if (patient) {
                        await enqueuePush({
                            recipientId: patient._id as any,
                            recipientType: "patient",
                            fcmToken: (patient as any).fcmToken ?? undefined,
                            title: "🔄 Still Finding Your Partner",
                            body: "Your assigned provider didn't respond in time. We're finding a replacement.",
                            data: { screen: `/booking/${String(b._id)}` },
                            refType: "ServiceRequest",
                            refId: b._id as any,
                        });
                    }
                } catch { /* non-fatal */ }
            }

            // ── 3. Escalate IN_PROGRESS bookings running more than 4 hours ──
            const overdue = await serviceRequestModel.find({
                status: "IN_PROGRESS",
                updatedAt: { $lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
            }).select("_id").lean();

            for (const b of overdue) {
                await notifyAdmin(
                    "🔴 Booking Overdue (IN_PROGRESS > 4h)",
                    `Booking #${String(b._id).slice(-6).toUpperCase()} has been in progress for over 4 hours. Please investigate.`,
                    "ServiceRequest",
                    String(b._id)
                );
            }

            if (stuckBroadcasted.length + stuckAssigned.length + overdue.length > 0) {
                console.info(`[HealthCheck] Recovered ${stuckBroadcasted.length} stuck broadcasts, ${stuckAssigned.length} timed-out assignments, flagged ${overdue.length} overdue IN_PROGRESS.`);
            }
        } catch (error) {
            console.error("[Cron] bookingHealthCheck error:", error);
        }
    });
};
