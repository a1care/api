import express from "express";
import { protect } from "../../middlewares/protect.js";
import { previewCoupon, getAvailableCoupons } from "./coupon.controller.js";

const router = express.Router();

// Public (authenticated patient)
router.get("/available", protect, getAvailableCoupons);
router.post("/preview", protect, previewCoupon);
router.post("/apply", protect, previewCoupon); // alias

export default router;
