/**
 * sendPushNotification.ts
 * Central utility for sending FCM push notifications + storing them in DB.
 *
 * Usage:
 *   await sendPush({
 *     recipientId: patient._id,
 *     recipientType: "patient",
 *     fcmToken: patient.fcmToken,
 *     title: "Booking Confirmed",
 *     body: "Your nurse is on the way.",
 *     data: { screen: "bookings", bookingId: booking._id.toString() },
 *     refType: "ServiceRequest",
 *     refId: booking._id,
 *   });
 *
 *   // Send to many tokens at once
 *   await sendPushToMany(recipients, title, body, data, refType, refId);
 */

import mongoose from "mongoose";
import { getMessaging } from "../configs/fcmConfig.js";
import {
    NotificationModel,
    type NotificationAudience,
} from "../modules/Notifications/notification.model.js";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PushPayload {
    recipientId: mongoose.Types.ObjectId | string;
    recipientType: NotificationAudience;
    fcmToken?: string | null | undefined;
    title: string;
    body: string;
    data?: Record<string, string> | undefined;
    refType?: "ServiceRequest" | "DoctorAppointment" | "Wallet" | "Ticket" | "Broadcast" | "Auth" | "Partner" | undefined;
    refId?: mongoose.Types.ObjectId | string | undefined;
}

// ─── Single recipient ─────────────────────────────────────────────────────────
export const sendPush = async (payload: PushPayload): Promise<void> => {
    const {
        recipientId,
        recipientType,
        fcmToken,
        title,
        body,
        data = {},
        refType,
        refId,
    } = payload;

    const messaging = getMessaging();

    let fcmStatus: "sent" | "failed" | "skipped" = "skipped";
    let fcmMessageId: string | undefined;

    if (messaging && fcmToken) {
        try {
            const result = await messaging.send({
                token: fcmToken,
                notification: { title, body },
                data,
                android: {
                    priority: "high",
                    notification: { sound: "default", clickAction: "FLUTTER_NOTIFICATION_CLICK" },
                },
                apns: {
                    payload: { aps: { sound: "default", badge: 1 } },
                },
            });
            fcmMessageId = result;
            fcmStatus = "sent";
        } catch (err: any) {
            console.error(`[FCM] Failed to send to ${String(recipientId)}:`, err?.message);
            fcmStatus = "failed";
        }
    } else if (!fcmToken) {
        fcmStatus = "skipped"; // no token registered
    }

    // Always persist to DB regardless of delivery outcome
    try {
        await NotificationModel.create({
            recipientId: new mongoose.Types.ObjectId(recipientId as string),
            recipientType,
            title,
            body,
            data,
            refType,
            refId: refId ? new mongoose.Types.ObjectId(refId as string) : undefined,
            fcmToken: fcmToken ?? undefined,
            fcmMessageId,
            fcmStatus,
            isRead: false,
        });
    } catch (dbErr: any) {
        console.error("[FCM] Failed to save notification to DB:", dbErr?.message);
    }
};

// ─── Multiple recipients (e.g., broadcast to all partners for a booking) ──────
export interface MultiPushTarget {
    recipientId: mongoose.Types.ObjectId | string;
    recipientType: NotificationAudience;
    fcmToken?: string | null;
}

export const sendPushToMany = async (
    targets: MultiPushTarget[],
    title: string,
    body: string,
    data: Record<string, string> = {},
    refType?: PushPayload["refType"],
    refId?: mongoose.Types.ObjectId | string
): Promise<void> => {
    // Fire all in parallel — never throw, just log
    await Promise.allSettled(
        targets.map((t) =>
            sendPush({
                recipientId: t.recipientId,
                recipientType: t.recipientType,
                fcmToken: t.fcmToken,
                title,
                body,
                data,
                refType,
                refId,
            })
        )
    );
};
