import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import doctorAppointmentModel from "../Bookings/doctorAppointment.model.js";
import MedicalRecord from "./medicalRecord.model.js";

function extractFileUrls(files: any, fieldName: string): string[] {
  const list = files?.[fieldName] ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((f: any) => f?.location || f?.path)
    .filter(Boolean);
}

export const createMedicalRecord = asyncHandler(async (req, res) => {
  const requesterId = req.user?.id;
  const role = req.user?.role;
  if (!requesterId) throw new ApiError(401, "Unauthorized");

  const { appointmentId, clinicalNotes = "", diagnosis = "" } = req.body;
  
  let patientId: string = requesterId;
  let doctorId: string | null = null;

  if (role === "Staff") {
    if (!appointmentId) throw new ApiError(400, "appointmentId is required for provider records");
    const appointment = await doctorAppointmentModel.findById(appointmentId);
    if (!appointment) throw new ApiError(404, "Appointment not found");
    if (appointment.doctorId.toString() !== requesterId.toString()) {
      throw new ApiError(403, "Not allowed for this appointment");
    }
    patientId = appointment.patientId.toString();
    doctorId = requesterId;
  } else {
    // Patient flow: manual upload
    patientId = requesterId;
    doctorId = req.body.doctorId || null;
  }

  const files = req.files as any;
  const prescriptions = extractFileUrls(files, "prescriptions");
  const labReports = extractFileUrls(files, "labReports");

  const record = await MedicalRecord.create({
    appointmentId: appointmentId || null,
    patientId,
    doctorId,
    clinicalNotes,
    diagnosis,
    prescriptions,
    labReports
  });

  return res.status(201).json(new ApiResponse(201, "Medical record created", record));
});

export const updateMedicalRecord = asyncHandler(async (req, res) => {
  const staffId = req.user?.id;
  if (!staffId) throw new ApiError(401, "Unauthorized");

  const staff = await Doctor.findById(staffId);
  if (!staff) throw new ApiError(403, "Only providers can update medical records");

  const { id } = req.params;
  const record = await MedicalRecord.findById(id);
  if (!record) throw new ApiError(404, "Medical record not found");

  if (record.doctorId?.toString() !== staffId.toString()) {
    throw new ApiError(403, "You are not allowed to update this medical record");
  }

  const { clinicalNotes, diagnosis } = req.body as any;
  if (typeof clinicalNotes === "string") record.clinicalNotes = clinicalNotes;
  if (typeof diagnosis === "string") record.diagnosis = diagnosis;

  const files = req.files as any;
  const prescriptions = extractFileUrls(files, "prescriptions");
  const labReports = extractFileUrls(files, "labReports");

  if (prescriptions.length) record.prescriptions.push(...prescriptions);
  if (labReports.length) record.labReports.push(...labReports);

  await record.save();
  return res.status(200).json(new ApiResponse(200, "Medical record updated", record));
});

export const getMyMedicalRecords = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const patient = await Patient.findById(userId);
  if (!patient) throw new ApiError(403, "Only patients can access this endpoint");

  const limit = Math.min(100, Number(req.query.limit) || 50);
  const records = await MedicalRecord.find({ patientId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("doctorId", "name mobileNumber profileImage")
    .populate("appointmentId", "status date startingTime endingTime");

  return res.status(200).json(new ApiResponse(200, "Medical records fetched", records));
});

export const getMedicalRecordById = asyncHandler(async (req, res) => {
  const requesterId = req.user?.id;
  if (!requesterId) throw new ApiError(401, "Unauthorized");

  const record = await MedicalRecord.findById(req.params.id)
    .populate("doctorId", "name mobileNumber profileImage")
    .populate("patientId", "name mobileNumber profileImage")
    .populate("appointmentId", "status date startingTime endingTime");

  if (!record) throw new ApiError(404, "Medical record not found");

  const [patient, staff] = await Promise.all([
    Patient.findById(requesterId).select("_id"),
    Doctor.findById(requesterId).select("_id")
  ]);

  const isPatient = !!patient && record.patientId.toString() === requesterId.toString();
  const isDoctor = !!staff && record.doctorId?.toString() === requesterId.toString();

  if (!isPatient && !isDoctor) throw new ApiError(403, "Access denied");

  return res.status(200).json(new ApiResponse(200, "Medical record fetched", record));
});

