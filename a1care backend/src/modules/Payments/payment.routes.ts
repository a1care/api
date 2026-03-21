import express from "express";
import { 
    createOrder, 
    initiatePayment, 
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

// Gateway Redirect (User comes back here)
router.all("/gateway-response", (req, res) => {
    res.send("<html><body><h2>Processing Payment...</h2><p>Please do not close this window.</p></body></html>");
});

// Webhook (No auth, because it's from Easebuzz - we verify with HASH)
router.post("/webhook", handleWebhook);

export default router;
