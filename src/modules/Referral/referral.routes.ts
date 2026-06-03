import { Router } from "express";
import { protect } from "../../middlewares/protect.js";
import { protectAdmin } from "../../middlewares/protectAdmin.js";
import { getMyReferralCode, validateReferralCode, getReferralStats } from "./referral.controller.js";

const router = Router();

// Patient routes
router.get("/my-code", protect, getMyReferralCode);
router.post("/validate", protect, validateReferralCode);

// Admin route
router.get("/stats", protectAdmin, getReferralStats);

export default router;
