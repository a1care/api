import { Router } from "express";
import { getPlans, createPlan, updatePlan, deletePlan, subscribe, getMySubscription, getHistory, getAdminSubscriptions, approveSubscription } from "./subscription.controller.js";
import { protect } from "../../middlewares/protect.js";

const router = Router();

router.get("/plans", getPlans);
router.post("/plans", protect, createPlan);
router.put("/plans/:id", protect, updatePlan);
router.delete("/plans/:id", protect, deletePlan);
router.post("/subscribe", protect, subscribe);
router.get("/my-active", protect, getMySubscription);
router.get("/history", protect, getHistory);

// Admin Routes
router.get("/admin/list", protect, getAdminSubscriptions);
router.put("/admin/approve/:id", protect, approveSubscription);

export default router;
