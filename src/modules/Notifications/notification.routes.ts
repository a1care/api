import { Router } from "express";
import { protect } from "../../middlewares/protect.js";
import {
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    updatePatientFcmToken,
    updatePartnerFcmToken,
} from "./notification.controller.js";

const notificationRoutes = Router();

// ── Shared inbox (patient uses /api/notifications, partner uses /api/partner/notifications)
// Routes mounted in app.ts at different prefixes
// This single file handles both — the recipientId comes from the JWT.

// In-app inbox
notificationRoutes.get("/", protect, getMyNotifications);
notificationRoutes.put("/read-all", protect, markAllNotificationsRead);
notificationRoutes.put("/:id/read", protect, markNotificationRead);

// FCM token registration
notificationRoutes.put("/fcm-token/patient", protect, updatePatientFcmToken);
notificationRoutes.put("/fcm-token/partner", protect, updatePartnerFcmToken);

export default notificationRoutes;
