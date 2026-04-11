import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  createAdmin,
  getAppManagementConfig,
  getAdminDashboardSummary,
  getAdminMe,
  listAdmins,
  listAuditLogs,
  listPatients,
  listDoctors,
  listUsersByCategory,
  createUserByCategory,
  getUserCategoryStats,
  loginAdmin,
  logoutAdmin,
  uploadAppManagementAsset,
  updateAppManagementConfig,
  updateAdminRole,
  updateUserStatus,
  deleteUser,
  getUserDetails,
  getDoctorBookings,
  getServiceBookings,
  getReturnedToAdminServiceBookings,
  updateDoctorBookingStatus,
  updateServiceBookingStatus,
  getHospitalBookings,
  getSystemConfig,
  updateSystemConfig,
  getAdminDashboardOverview,
  getAdminDoctorPerformance,
  getAdminRecentActivity,
  getAdminPayouts,
  updateAdminPayoutStatus,
  getHealthVaultAudit,
  getUserWalletBalance,
  adjustUserWallet
} from "./admin.controller.js";
import { adminListNotifications, adminBroadcastNotification } from "../Notifications/notification.controller.js";
import { getAllReviews, updateReviewStatus } from "../Reviews/review.controller.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";
import { adminListOrders, adminGetLogsForTxn } from "../Payments/payment.controller.js";

const adminRoutes = Router();
const appAssetUploadDir = path.join(process.cwd(), "uploads", "app-management");
fs.mkdirSync(appAssetUploadDir, { recursive: true });

const appAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, appAssetUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "") || ".bin";
      const safeExt = ext.slice(0, 10);
      cb(null, `asset-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image uploads are allowed"));
  }
});

adminRoutes.post("/auth/login", loginAdmin);
adminRoutes.get("/auth/me", protectAdmin, getAdminMe);
adminRoutes.post("/auth/logout", protectAdmin, logoutAdmin);

adminRoutes.get("/dashboard/summary", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminDashboardSummary);
adminRoutes.get("/dashboard/overview", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminDashboardOverview);
adminRoutes.get("/dashboard/doctor-performance", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminDoctorPerformance);
adminRoutes.get("/dashboard/recent-bookings", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminRecentActivity);

adminRoutes.post("/users", protectAdmin, requireAdminRole(["super_admin"]), createAdmin);
adminRoutes.get("/users", protectAdmin, requireAdminRole(["super_admin"]), listAdmins);
adminRoutes.put("/users/:id/role", protectAdmin, requireAdminRole(["super_admin"]), updateAdminRole);
adminRoutes.get("/patients", protectAdmin, requireAdminRole(["admin", "super_admin"]), listPatients);
adminRoutes.get("/doctors", protectAdmin, requireAdminRole(["admin", "super_admin"]), listDoctors);
adminRoutes.get("/user-stats/:category", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserCategoryStats);
adminRoutes.get("/user-list/:category", protectAdmin, requireAdminRole(["admin", "super_admin"]), listUsersByCategory);
adminRoutes.post("/users/:category/create", protectAdmin, requireAdminRole(["admin", "super_admin"]), createUserByCategory);
adminRoutes.get("/users/:category/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserDetails);
adminRoutes.put("/users/:category/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateUserStatus);
adminRoutes.get("/users/:category/:userId/wallet-balance", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserWalletBalance);
adminRoutes.post("/users/:category/:userId/wallet-adjust", protectAdmin, requireAdminRole(["admin", "super_admin"]), adjustUserWallet);
adminRoutes.delete("/users/:category/:id", protectAdmin, requireAdminRole(["super_admin"]), deleteUser);

adminRoutes.get("/bookings/doctors", protectAdmin, requireAdminRole(["admin", "super_admin"]), getDoctorBookings);
adminRoutes.put("/bookings/doctors/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateDoctorBookingStatus);

adminRoutes.get("/bookings/services", protectAdmin, requireAdminRole(["admin", "super_admin"]), getServiceBookings);
adminRoutes.get("/bookings/services/returned", protectAdmin, requireAdminRole(["admin", "super_admin"]), getReturnedToAdminServiceBookings);
adminRoutes.put("/bookings/services/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateServiceBookingStatus);
adminRoutes.get("/bookings/hospital", protectAdmin, requireAdminRole(["admin", "super_admin"]), getHospitalBookings);

adminRoutes.get("/audit/logs", protectAdmin, requireAdminRole(["super_admin"]), listAuditLogs);
adminRoutes.get("/audit/health-vault", protectAdmin, requireAdminRole(["admin", "super_admin"]), getHealthVaultAudit);
adminRoutes.get("/app-management/:appKey", protectAdmin, requireAdminRole(["super_admin"]), getAppManagementConfig);
adminRoutes.put("/app-management/:appKey", protectAdmin, requireAdminRole(["super_admin"]), updateAppManagementConfig);
adminRoutes.post(
  "/app-management/upload",
  protectAdmin,
  requireAdminRole(["super_admin"]),
  appAssetUpload.single("asset"),
  uploadAppManagementAsset
);

// System credentials management (Firebase, Maps, Easebuzz, Email)
adminRoutes.get("/system-config", protectAdmin, getSystemConfig);
adminRoutes.put("/system-config", protectAdmin, updateSystemConfig);

// Notification Management
adminRoutes.get("/notifications", protectAdmin, adminListNotifications);
adminRoutes.post("/notifications/broadcast", protectAdmin, adminBroadcastNotification);

// Payout Management
adminRoutes.get("/payouts", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminPayouts);
adminRoutes.put("/payouts/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateAdminPayoutStatus);

// Review Management
adminRoutes.get("/reviews", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAllReviews);
adminRoutes.put("/reviews/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateReviewStatus);

// Payment / Transaction Audit
adminRoutes.get("/payments/orders", protectAdmin, requireAdminRole(["admin", "super_admin"]), adminListOrders);
adminRoutes.get("/payments/logs/:txnId", protectAdmin, requireAdminRole(["admin", "super_admin"]), adminGetLogsForTxn);

export default adminRoutes;
