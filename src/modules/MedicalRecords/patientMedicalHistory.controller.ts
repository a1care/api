import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import doctorAppointmentModel from "../Bookings/doctorAppointment.model.js";
import serviceRequestModel from "../Bookings/service/serviceRequest.model.js";
import { Patient } from "../Authentication/patient.model.js";
import MedicalRecord from "./medicalRecord.model.js";

export const getPatientMedicalHistory = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const patient = await Patient.findById(userId).select("_id");
  if (!patient) throw new ApiError(403, "Only patients can access medical history");

  const limit = Math.min(200, Number(req.query.limit) || 50);

  const [appointments, services, records] = await Promise.all([
    doctorAppointmentModel
      .find({ patientId: new mongoose.Types.ObjectId(userId), status: "Completed" })
      .populate("doctorId", "name mobileNumber profileImage specialization")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    serviceRequestModel
      .find({ userId: new mongoose.Types.ObjectId(userId), status: "COMPLETED" })
      .populate("childServiceId", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    MedicalRecord.find({ patientId: new mongoose.Types.ObjectId(userId) })
      .select("_id appointmentId clinicalNotes diagnosis prescriptions labReports createdAt")
      .lean()
  ]);

  const recordByAppointmentId = new Map<string, any>();
  for (const record of records) {
    recordByAppointmentId.set(String(record.appointmentId), record);
  }

  const timeline = [
    ...appointments.map((a: any) => {
      const record = recordByAppointmentId.get(String(a._id));
      return {
        type: "APPOINTMENT",
        id: a._id,
        status: a.status,
        occurredAt: a.date || a.createdAt,
        provider: {
          id: a.doctorId?._id,
          name: a.doctorId?.name,
          mobileNumber: a.doctorId?.mobileNumber,
          profileImage: a.doctorId?.profileImage,
          specialization: a.doctorId?.specialization?.[0] ?? null
        },
        paymentStatus: a.paymentStatus,
        amount: a.totalAmount ?? 0,
        appointment: {
          date: a.date,
          startingTime: a.startingTime,
          endingTime: a.endingTime
        },
        medicalRecord: record
          ? {
            id: record._id,
            clinicalNotes: record.clinicalNotes ?? "",
            diagnosis: record.diagnosis ?? "",
            prescriptions: record.prescriptions ?? [],
            labReports: record.labReports ?? [],
            createdAt: record.createdAt
          }
          : null
      };
    }),
    ...services.map((s: any) => ({
      type: "SERVICE",
      id: s._id,
      status: s.status,
      occurredAt: s.createdAt,
      service: {
        id: s.childServiceId?._id ?? s.childServiceId,
        name: s.childServiceId?.name ?? "Service"
      },
      bookingType: s.bookingType,
      fulfillmentMode: s.fulfillmentMode,
      paymentStatus: s.paymentStatus,
      amount: s.price ?? 0
    }))
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  return res.status(200).json(new ApiResponse(200, "Medical history fetched", timeline));
});

