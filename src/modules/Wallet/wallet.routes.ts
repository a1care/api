import express from "express";
import { protect } from "../../middlewares/protect.js";
import { getWallet, addMoney, initiatePayment, handlePaymentResponse } from "./wallet.controller.js";

const router = express.Router();

router.get("/", protect, getWallet);
router.post("/add", protect, addMoney);
router.post("/initiate", protect, initiatePayment);
router.post("/response", handlePaymentResponse);

export default router;
