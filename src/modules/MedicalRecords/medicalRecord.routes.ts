import express from "express";
import { protect } from "../../middlewares/protect.js";
import { uploadMedicalRecordAssets } from "../../middlewares/upload.js";
import {
  createMedicalRecord,
  getMedicalRecordById,
  getMyMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord
} from "./medicalRecord.controller.js";

const router = express.Router();

// Patient: list own records
router.get("/my", protect, getMyMedicalRecords);

// Patient/Doctor: view single record (RBAC enforced in controller)
router.get("/:id", protect, getMedicalRecordById);

// Doctor: create/update record for an appointment (RBAC enforced in controller)
router.post("/", protect, uploadMedicalRecordAssets, createMedicalRecord);
router.put("/:id", protect, uploadMedicalRecordAssets, updateMedicalRecord);
router.delete("/:id", protect, deleteMedicalRecord);

export default router;

