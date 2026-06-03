import { Router } from "express";
import { getPlans, createPlan, updatePlan, deletePlan, subscribe, getMySubscription, getHistory, getAdminSubscriptions, approveSubscription } from "./subscription.controller.js";
import { protect } from "../../middlewares/protect.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";

const router = Router();

// Partners/public may view plans and manage their own subscription
router.get("/plans", getPlans);
router.post("/subscribe", protect, subscribe);
router.get("/my-active", protect, getMySubscription);
router.get("/history", protect, getHistory);

// Admin-only: plan management (price-sensitive) + subscription approvals.
// Previously these used `protect`, letting any partner create a ₹0 plan and self-approve
// their own subscription, bypassing payment entirely.
router.post("/plans", protectAdmin, requireAdminRole(["admin", "super_admin"]), createPlan);
router.put("/plans/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), updatePlan);
router.delete("/plans/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), deletePlan);
router.get("/admin/list", protectAdmin, requireAdminRole(["admin", "super_admin"]), getAdminSubscriptions);
router.put("/admin/approve/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), approveSubscription);

export default router;
