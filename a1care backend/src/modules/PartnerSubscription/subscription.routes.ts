import { Router } from "express";
import { getPlans, createPlan, updatePlan, deletePlan, subscribe, getMySubscription, getHistory } from "./subscription.controller.js";
import { protect } from "../../middlewares/protect.js";

const router = Router();

router.get("/plans", getPlans);
router.post("/plans", protect, createPlan);
router.put("/plans/:id", protect, updatePlan);
router.delete("/plans/:id", protect, deletePlan);
router.post("/subscribe", protect, subscribe);
router.get("/my-active", protect, getMySubscription);
router.get("/history", protect, getHistory);

export default router;
