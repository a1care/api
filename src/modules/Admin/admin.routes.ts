import { Router } from "express";
import { createS3Upload } from "../../middlewares/upload.js";
import {
  createAdmin,
  getAppManagementConfig,
  getAdminDashboardSummary,
  getAdminMe,
  listAdmins,
  listAuditLogs,
  listPatients,
  listDoctors,
  softDeleteDoctor,
  restoreDoctor,
  hardDeleteDoctor,
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
  getDoctorBookingById,
  getServiceBookings,
  getServiceBookingById,
  getReturnedToAdminServiceBookings,
  rebroadcastServiceBooking,
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
  adjustUserWallet,
  getDeletionRequests,
  approveDeletion,
  restoreDeletion,
  getDoctorAvailabilityAdmin,
  upsertDoctorAvailabilityAdmin,
  debugPartnerServiceEligibility,
  getAdminCommissionReport,
  getEmailTemplates,
  updateEmailTemplate,
  getSuperAdminWalletOverview,
  issueServiceRefund
} from "./admin.controller.js";
import { adminListNotifications, adminBroadcastNotification, adminClearNotifications, adminDeleteNotification } from "../Notifications/notification.controller.js";
import { getAllReviews, updateReviewStatus } from "../Reviews/review.controller.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";
import { adminListOrders, adminGetLogsForTxn } from "../Payments/payment.controller.js";
import { getReferralStats } from "../Referral/referral.controller.js";
import { createCoupon, listCoupons, updateCoupon, deleteCoupon } from "../Coupons/coupon.controller.js";

const adminRoutes = Router();

const appAssetUpload = createS3Upload({
  folder: "app-management",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB: 5,
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
adminRoutes.put("/doctors/:id/soft-delete", protectAdmin, requireAdminRole(["admin", "super_admin"]), softDeleteDoctor);
adminRoutes.put("/doctors/:id/restore", protectAdmin, requireAdminRole(["admin", "super_admin"]), restoreDoctor);
adminRoutes.delete("/doctors/:id/hard-delete", protectAdmin, requireAdminRole(["super_admin"]), hardDeleteDoctor);
adminRoutes.get("/doctors/:doctorId/availability", protectAdmin, requireAdminRole(["admin", "super_admin"]), getDoctorAvailabilityAdmin);
adminRoutes.post("/doctors/:doctorId/availability", protectAdmin, requireAdminRole(["admin", "super_admin"]), upsertDoctorAvailabilityAdmin);
adminRoutes.get("/user-stats/:category", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserCategoryStats);
adminRoutes.get("/user-list/:category", protectAdmin, requireAdminRole(["admin", "super_admin"]), listUsersByCategory);
adminRoutes.post("/users/:category/create", protectAdmin, requireAdminRole(["admin", "super_admin"]), createUserByCategory);
adminRoutes.get("/users/:category/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserDetails);
adminRoutes.put("/users/:category/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateUserStatus);
adminRoutes.get("/users/:category/:userId/wallet-balance", protectAdmin, requireAdminRole(["admin", "super_admin"]), getUserWalletBalance);
adminRoutes.post("/users/:category/:userId/wallet-adjust", protectAdmin, requireAdminRole(["admin", "super_admin"]), adjustUserWallet);
adminRoutes.delete("/users/:category/:id", protectAdmin, requireAdminRole(["super_admin"]), deleteUser);

adminRoutes.get("/bookings/doctors", protectAdmin, requireAdminRole(["admin", "super_admin"]), getDoctorBookings);
adminRoutes.get("/bookings/doctors/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), getDoctorBookingById);
adminRoutes.put("/bookings/doctors/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateDoctorBookingStatus);

adminRoutes.get("/bookings/services", protectAdmin, requireAdminRole(["admin", "super_admin"]), getServiceBookings);
adminRoutes.get("/bookings/services/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), getServiceBookingById);
adminRoutes.get("/bookings/services/debug-eligibility", protectAdmin, requireAdminRole(["admin", "super_admin"]), debugPartnerServiceEligibility);
adminRoutes.get("/bookings/services/returned", protectAdmin, requireAdminRole(["admin", "super_admin"]), getReturnedToAdminServiceBookings);
adminRoutes.put("/bookings/services/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateServiceBookingStatus);
adminRoutes.post("/bookings/services/:id/rebroadcast", protectAdmin, requireAdminRole(["admin", "super_admin"]), rebroadcastServiceBooking);
adminRoutes.post("/bookings/services/:id/refund", protectAdmin, requireAdminRole(["admin", "super_admin"]), issueServiceRefund);
import { verifyCheckInPin } from '../Bookings/service/serviceRequest.controller.js';
adminRoutes.post("/bookings/services/verify-pin/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), verifyCheckInPin);
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

adminRoutes.get("/system-config", protectAdmin, requireAdminRole(["super_admin"]), getSystemConfig);
adminRoutes.put("/system-config", protectAdmin, requireAdminRole(["super_admin"]), updateSystemConfig);

adminRoutes.get("/email-templates", protectAdmin, requireAdminRole(["super_admin"]), getEmailTemplates);
adminRoutes.put("/email-templates/:id", protectAdmin, requireAdminRole(["super_admin"]), updateEmailTemplate);

adminRoutes.get("/notifications", protectAdmin, adminListNotifications);
adminRoutes.post("/notifications/broadcast", protectAdmin, requireAdminRole(["super_admin"]), adminBroadcastNotification);
adminRoutes.delete("/notifications/clear", protectAdmin, requireAdminRole(["super_admin"]), adminClearNotifications);
adminRoutes.delete("/notifications/:id", protectAdmin, adminDeleteNotification);

adminRoutes.get("/payouts", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminPayouts);
adminRoutes.put("/payouts/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateAdminPayoutStatus);

// Commission report (per-booking commission ledger)
adminRoutes.get("/commission/report", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminCommissionReport);

adminRoutes.get("/reviews", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAllReviews);
adminRoutes.put("/reviews/:id/status", protectAdmin, requireAdminRole(["admin", "super_admin"]), updateReviewStatus);

adminRoutes.get("/payments/orders", protectAdmin, requireAdminRole(["admin", "super_admin"]), adminListOrders);
adminRoutes.get("/payments/logs/:txnId", protectAdmin, requireAdminRole(["admin", "super_admin"]), adminGetLogsForTxn);

adminRoutes.get("/deletion-requests", protectAdmin, requireAdminRole(["super_admin"]), getDeletionRequests);
adminRoutes.post("/deletion-approve/:id", protectAdmin, requireAdminRole(["super_admin"]), approveDeletion);
adminRoutes.post("/deletion-restore/:id", protectAdmin, requireAdminRole(["super_admin"]), restoreDeletion);

// Referrals
adminRoutes.get("/referrals", protectAdmin, requireAdminRole(["admin", "super_admin"]), getReferralStats);

// Coupons
adminRoutes.post("/coupons", protectAdmin, requireAdminRole(["super_admin"]), createCoupon);
adminRoutes.get("/coupons", protectAdmin, requireAdminRole(["admin", "super_admin"]), listCoupons);
adminRoutes.put("/coupons/:id", protectAdmin, requireAdminRole(["super_admin"]), updateCoupon);
adminRoutes.delete("/coupons/:id", protectAdmin, requireAdminRole(["super_admin"]), deleteCoupon);

// Super Admin Wallet Overview
adminRoutes.get("/super-admin-wallet", protectAdmin, requireAdminRole(["super_admin"]), getSuperAdminWalletOverview);

export default adminRoutes;
