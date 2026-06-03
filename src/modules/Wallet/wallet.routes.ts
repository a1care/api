import express from "express";
import { protect } from "../../middlewares/protect.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";
import { getWallet, addMoney, initiatePayment, handlePaymentResponse } from "./wallet.controller.js";

const router = express.Router();

router.get("/", protect, getWallet);
// Manual wallet credit is an ADMIN-only adjustment. Previously this used `protect`,
// letting any patient credit themselves an unlimited balance.
router.post("/add", protectAdmin, requireAdminRole(["admin", "super_admin"]), addMoney);
router.post("/initiate", protect, initiatePayment);
router.post("/response", handlePaymentResponse);

export default router;
