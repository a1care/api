/**
 * Notification Model
 * Every push notification sent is also stored in MongoDB so users can see their
 * full notification history in the app and the admin can audit them.
 */

import mongoose, { Schema, Document } from "mongoose";

export type NotificationAudience =
    | "patient"   // Customer app user
    | "partner"   // Provider / doctor / partner
    | "admin";    // Admin-facing (bell only)

export interface NotificationDocument extends Document {
    // Who receives this notification
    recipientId: mongoose.Types.ObjectId;     // User's _id (Patient or Doctor)
    recipientType: NotificationAudience;

    // Content
    title: string;
    body: string;
    data?: Record<string, string>;            // Deep-link or metadata payload

    // Context — which booking / entity triggered this
    refType?: "ServiceRequest" | "DoctorAppointment" | "Wallet" | "Ticket" | "Broadcast" | "Auth" | "Partner";
    refId?: mongoose.Types.ObjectId;

    // Delivery state
    fcmToken?: string;                        // Token used at time of send
    fcmMessageId?: string;                    // FCM response message id
    fcmStatus: "sent" | "failed" | "skipped";// skipped = no FCM token available

    // Read state (in-app)
    isRead: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        recipientType: {
            type: String,
            enum: ["patient", "partner", "admin"],
            required: true,
        },

        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },
        data: { type: Map, of: String, default: {} },

        refType: {
            type: String,
            enum: ["ServiceRequest", "DoctorAppointment", "Wallet", "Ticket", "Broadcast", "Auth", "Partner"],
        },
        refId: { type: Schema.Types.ObjectId },

        fcmToken: { type: String },
        fcmMessageId: { type: String },
        fcmStatus: {
            type: String,
            enum: ["sent", "failed", "skipped"],
            default: "skipped",
        },

        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index for efficient per-user notification listing + filters
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

export const NotificationModel = mongoose.model<NotificationDocument>(
    "Notification",
    NotificationSchema
);
