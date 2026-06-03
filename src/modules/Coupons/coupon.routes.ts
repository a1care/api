import express from "express";
import { protect } from "../../middlewares/protect.js";
import { previewCoupon } from "./coupon.controller.js";

const router = express.Router();

// Public (authenticated patient) — preview the discount before booking
router.post("/preview", protect, previewCoupon);
router.post("/apply", protect, previewCoupon); // alias

export default router;
