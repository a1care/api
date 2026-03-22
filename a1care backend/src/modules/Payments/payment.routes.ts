import express from "express";
import { 
    createOrder, 
    initiatePayment, 
    handleGatewayResponse,
    handleWebhook, 
    verifyPayment, 
    getOrderById 
} from "./payment.controller.js";
import { protect } from "../../middlewares/protect.js";

const router = express.Router();

// Order Creation (Frontend needs to provide amount/type, backend validates)
router.post("/orders/create", protect, createOrder);

// Initiate Payment (Get Gateway Parameters)
router.post("/initiate", protect, initiatePayment);

// Verify Status (On Return to App)
router.post("/verify", protect, verifyPayment);

// Fetch Single Order
router.get("/orders/:id", protect, getOrderById);

// Gateway Redirect (User comes back here after payment)
router.all("/gateway-response", handleGatewayResponse);

// Webhook (No auth, because it's from Easebuzz - we verify with HASH)
router.post("/webhook", handleWebhook);

export default router;
