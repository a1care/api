import express from "express";
import { protect } from "../../middlewares/protect.js";
import { getPatientMedicalHistory } from "./patientMedicalHistory.controller.js";

const router = express.Router();

// GET /api/patient/medical-history
router.get("/medical-history", protect, getPatientMedicalHistory);

export default router;

