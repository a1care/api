import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { NotificationModel } from "./notification.model.js";
import { Patient } from "../Authentication/patient.model.js";
import DoctorModel from "../Doctors/doctor.model.js";
import { enqueuePush, enqueuePushToMany } from "../../queues/communicationQueue.js";

// ─── FCM Token Registration ───────────────────────────────────────────────────

/**
 * PUT /api/patient/auth/fcm-token
 * Updates the FCM token for the logged-in patient.
 */
export const updatePatientFcmToken = asyncHandler(async (req, res) => {
    const patientId = req.user?.id;
    if (!patientId) throw new ApiError(401, "Unauthorized");

    const { fcmToken } = req.body;
    if (!fcmToken) throw new ApiError(400, "fcmToken is required");

    await Patient.findByIdAndUpdate(patientId, { fcmToken });
    return res.json(new ApiResponse(200, "FCM token updated", null));
});

/**
 * PUT /api/doctor/fcm-token
 * Updates the FCM token for the logged-in doctor/partner.
 */
export const updatePartnerFcmToken = asyncHandler(async (req, res) => {
    const doctorId = req.user?.id;
    if (!doctorId) throw new ApiError(401, "Unauthorized");

    const { fcmToken } = req.body;
    if (!fcmToken) throw new ApiError(400, "fcmToken is required");

    await DoctorModel.findByIdAndUpdate(doctorId, { fcmToken });
    return res.json(new ApiResponse(200, "FCM token updated", null));
});

// ─── User Notification Inbox ──────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Returns paginated notifications for the logged-in user (patient or partner).
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { recipientId: new mongoose.Types.ObjectId(userId) };
    if (req.query.unread === "true") filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
        NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationModel.countDocuments(filter),
        NotificationModel.countDocuments({
            recipientId: new mongoose.Types.ObjectId(userId),
            isRead: false,
        }),
    ]);

    return res.json(
        new ApiResponse(200, "Notifications fetched", {
            notifications,
            unreadCount,
            total,
            page,
            pages: Math.ceil(total / limit),
        })
    );
});

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;

    const updated = await NotificationModel.findOneAndUpdate(
        { _id: id, recipientId: new mongoose.Types.ObjectId(userId!) },
        { isRead: true },
        { new: true }
    );
    if (!updated) throw new ApiError(404, "Notification not found");
    return res.json(new ApiResponse(200, "Marked as read", updated));
});

/**
 * PUT /api/notifications/read-all
 * Marks all unread notifications for the user as read.
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    await NotificationModel.updateMany(
        { recipientId: new mongoose.Types.ObjectId(userId!), isRead: false },
        { isRead: true }
    );
    return res.json(new ApiResponse(200, "All notifications marked as read", null));
});

// ─── Admin: Notification Management ──────────────────────────────────────────

/**
 * GET /api/admin/notifications
 * Lists all notifications across all users (with filters).
 */
export const adminListNotifications = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.recipientType) filter.recipientType = req.query.recipientType;
    if (req.query.refType) filter.refType = req.query.refType;
    if (req.query.fcmStatus) filter.fcmStatus = req.query.fcmStatus;
    if (req.query.recipientId) {
        filter.recipientId = new mongoose.Types.ObjectId(req.query.recipientId as string);
    }

    const [notifications, total] = await Promise.all([
        NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        NotificationModel.countDocuments(filter),
    ]);

    return res.json(
        new ApiResponse(200, "Notifications fetched", {
            notifications,
            total,
            page,
            pages: Math.ceil(total / limit),
        })
    );
});

/**
 * POST /api/admin/notifications/broadcast
 * Admin sends a push notification with filters.
 *
 * Body:
 * {
 *   title: string,
 *   body: string,
 *   audience: "all" | "patients" | "partners" | "individual",
 *   recipientId?: string,           // required when audience = "individual"
 *   recipientType?: "patient"|"partner",  // required for individual
 *   data?: { key: value }           // optional deep-link payload
 * }
 */
export const adminBroadcastNotification = asyncHandler(async (req, res) => {
    const { title, body, audience, recipientId, recipientType, data = {} } = req.body;

    if (!title || !body) throw new ApiError(400, "title and body are required");
    if (!audience) throw new ApiError(400, "audience is required");

    const validAudiences = ["all", "patients", "partners", "individual"];
    if (!validAudiences.includes(audience)) {
        throw new ApiError(400, `audience must be one of: ${validAudiences.join(", ")}`);
    }

    // ── Individual ──────────────────────────────────────────────
    if (audience === "individual") {
        if (!recipientId || !recipientType) {
            throw new ApiError(400, "recipientId and recipientType required for individual audience");
        }
        if (!["patient", "partner"].includes(recipientType)) {
            throw new ApiError(400, "recipientType must be 'patient' or 'partner'");
        }

        let token: string | undefined;
        let name = "Unknown";

        if (recipientType === "patient") {
            const u = await Patient.findById(recipientId).select("fcmToken name");
            if (!u) throw new ApiError(404, "Patient not found");
            token = u.fcmToken;
            name = u.name || "Customer";
        } else {
            const u = await DoctorModel.findById(recipientId).select("fcmToken name");
            if (!u) throw new ApiError(404, "Partner not found");
            token = (u as any).fcmToken;
            name = u.name || "Partner";
        }

        await enqueuePush({
            recipientId,
            recipientType,
            fcmToken: token,
            title,
            body,
            data,
            refType: "Broadcast",
        });

        return res.json(
            new ApiResponse(200, `Notification sent to ${name}`, { recipientId, recipientType })
        );
    }

    // ── All patients ─────────────────────────────────────────────
    let sent = 0;

    if (audience === "all" || audience === "patients") {
        const patients = await Patient.find({}).select("_id fcmToken");
        const targets = patients.map((p) => ({
            recipientId: p._id as mongoose.Types.ObjectId,
            recipientType: "patient" as const,
            fcmToken: p.fcmToken,
        }));
        await enqueuePushToMany(targets, title, body, data, "Broadcast");
        sent += targets.length;
    }

    // ── All partners ─────────────────────────────────────────────
    if (audience === "all" || audience === "partners") {
        const partners = await DoctorModel.find({}).select("_id fcmToken");
        const targets = partners.map((p) => ({
            recipientId: p._id as mongoose.Types.ObjectId,
            recipientType: "partner" as const,
            fcmToken: (p as any).fcmToken,
        }));
        await enqueuePushToMany(targets, title, body, data, "Broadcast");
        sent += targets.length;
    }

    return res.json(
        new ApiResponse(200, `Broadcast sent to ${sent} recipient(s)`, { sent, audience })
    );
});
