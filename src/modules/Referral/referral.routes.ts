import { Router } from "express";
import { protect } from "../../middlewares/protect.js";
import { protectAdmin } from "../../middlewares/protectAdmin.js";
import { getMyReferralCode, validateReferralCode, getReferralStats, getReferralConfig, updateReferralConfig, getMyEarnings, handleReferralRedirect, approveReferral } from "./referral.controller.js";

const router = Router();

// Public route for App Store Redirects
router.get("/redirect", handleReferralRedirect);

// Patient routes
router.get("/my-code", protect, getMyReferralCode);
router.get("/my-earnings", protect, getMyEarnings);
router.post("/validate", protect, validateReferralCode);

// Admin route
router.get("/stats", protectAdmin, getReferralStats);
router.get("/config", protectAdmin, getReferralConfig);
router.put("/config", protectAdmin, updateReferralConfig);
router.put("/:id/approve", protectAdmin, approveReferral);

export default router;
