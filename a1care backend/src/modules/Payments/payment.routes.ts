import express from "express";
import {
    createOrder,
    initiatePayment,
    initiateRazorpay,
    handleGatewayResponse,
    handleWebhook,
    verifyPayment,
    verifyRazorpay,
    getOrderById
} from "./payment.controller.js";
import { protect } from "../../middlewares/protect.js";

const router = express.Router();

// Order Creation
router.post("/orders/create", protect, createOrder);

// Easebuzz Initiation (Existing)
router.post("/initiate", protect, initiatePayment);

// Razorpay Initiation
router.post("/razorpay/initiate", protect, initiateRazorpay);

// Razorpay Verification
router.post("/razorpay/verify", protect, verifyRazorpay);

// Verify Status
router.post("/verify", protect, verifyPayment);

// Fetch Single Order
router.get("/orders/:id", protect, getOrderById);

// Gateway Redirect (User comes back here after payment)
router.all("/gateway-response", handleGatewayResponse);

// Webhook (No auth, because it's from Easebuzz - we verify with HASH)
router.post("/webhook", handleWebhook);

export default router;
