import express from "express";
import { getEarningsSummary, getPayoutHistory, requestPayout, getBookingEarningsHistory } from "./earnings.controller.js";
import { protect } from "../../middlewares/protect.js";

const earningsRoutes = express.Router();

earningsRoutes.use(protect);

earningsRoutes.get("/summary", getEarningsSummary);
earningsRoutes.post("/withdraw", requestPayout);
earningsRoutes.get("/payouts", getPayoutHistory);
earningsRoutes.get("/history", getBookingEarningsHistory);

export default earningsRoutes;
