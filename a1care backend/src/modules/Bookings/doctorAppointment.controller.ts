import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import doctorAppoinmentValidations from "./doctoAppointments.schema.js";
import doctorAppointmentModel from "./doctorAppointment.model.js";
import { creditWalletAtomic, processPaymentFromWallet } from "../Wallet/wallet.controller.js";
import DoctorModel from "../Doctors/doctor.model.js";
import { Patient } from "../Authentication/patient.model.js";
import { enqueueEmail, enqueuePush } from "../../queues/communicationQueue.js";
import { readConfigStore } from "../Admin/admin.controller.js";
import HospitalBooking from "./hospitalBooking.model.js";
import { getActiveCommissionRate } from "../PartnerSubscription/subscription.controller.js";


export const createDoctorAppointment = asyncHandler(async (req, res) => {
    const patientId = req.user?.id;
    if (!patientId) throw new ApiError(401, "Not authorized");

    const { doctorId } = req.params;
    if (!doctorId) throw new ApiError(400, "Doctor ID is required");

    let totalAmount = req.body.totalAmount;
    const doctor = await DoctorModel.findById(doctorId);
    if (!totalAmount && doctor) totalAmount = doctor.consultationFee;
    if (totalAmount === undefined || totalAmount === null) throw new ApiError(400, "Consultation fee not found");

    const payload = {
        ...req.body,
        doctorId,
        patientId,
        totalAmount,
        paymentStatus: req.body.paymentMode === 'ONLINE' ? 'COMPLETED' : 'PENDING',
    };

    const parsed = doctorAppoinmentValidations.safeParse(payload);
    if (!parsed.success) {
        console.error("Error in creating doctor appointment", parsed.error);
        throw new ApiError(400, `Validation failed! ${parsed.error}`);
    }

    if (payload.paymentMode === 'ONLINE') {
        try {
            await processPaymentFromWallet(patientId, totalAmount, `Booking for Dr. ${payload.doctorId}`);
        } catch (error: any) {
            throw new ApiError(400, error.message || "Payment failed");
        }
    }

    const newAppointment = new doctorAppointmentModel(parsed.data);
    await newAppointment.save();

    // ── New: Send Confirmation Email ─────────────────────────────────────
    try {
        const patient = await Patient.findById(patientId);
        if (patient?.email) {
            await enqueueEmail({
                kind: "appointment",
                data: {
                    email: patient.email,
                    fullName: patient.name || "Customer",
                    serviceName: `Consultation with Dr. ${doctor?.name || "Doctor"}`,
                    date: new Date(newAppointment.date).toDateString(),
                    time: `${newAppointment.startingTime} - ${newAppointment.endingTime}`,
                    location: "Clinic / In-App Video",
                },
            });
        }
    } catch (e) {
        console.error("[Email] booking confirmation email error:", e);
    }

    // ── Push: notify the doctor of new appointment ────────────────────────────
    try {
        const patient = await Patient.findById(patientId).select("name");
        if (doctor) {
            await enqueuePush({
                recipientId: doctor._id as mongoose.Types.ObjectId,
                recipientType: "partner",
                fcmToken: doctor.fcmToken ?? null,
                title: "📅 New Appointment Request",
                body: `${patient?.name ?? "A patient"} has booked a consultation with you.`,
                data: { screen: "appointments", appointmentId: String(newAppointment._id) },
                refType: "DoctorAppointment",
                refId: newAppointment._id as mongoose.Types.ObjectId,
            });
        }
    } catch (e) {
        console.error("[Push] doctor appointment push error:", e);
    }

    return res.status(201).json(new ApiResponse(201, "Appointment booked", newAppointment));
});

// get appointments by doctor id
export const getPendingAppointmentbyProviderId = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    const { status } = req.query;
    if (!providerId) throw new ApiError(401, "Provider id not found");

    if (mongoose.connection.readyState !== 1) throw new ApiError(503, "Database unavailable");

    const pendingAppointments = await doctorAppointmentModel.find({
        doctorId: new mongoose.Types.ObjectId(providerId),
        status: { $in: ["Pending", "Confirmed"] },
    });
    return res.json(new ApiResponse(200, "fetch appointment details", pendingAppointments));
});

// get appointment by patient id
export const getAppointmentsByPatientId = asyncHandler(async (req, res) => {
    const patientId = req.user?.id;
    if (mongoose.connection.readyState !== 1) throw new ApiError(503, "Database unavailable");
    const appointments = await doctorAppointmentModel
        .find({ patientId: patientId as string })
        .populate("doctorId")
        .populate("patientId");
    return res.status(200).json(new ApiResponse(200, "Appointments fetched", appointments));
});

/**
 * PATCH /api/appointment/:id/status
 * Doctor or Admin updates appointment status → push to patient.
 */
export const updateDoctorAppointmentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new ApiError(400, "status is required");

    const existing = await doctorAppointmentModel.findById(id);
    if (!existing) throw new ApiError(404, "Appointment not found");

    const requesterId = req.user?.id;
    if (!requesterId) throw new ApiError(401, "Not authorized");

    const isPatient = existing.patientId.toString() === requesterId.toString();
    const isDoctor = existing.doctorId.toString() === requesterId.toString();
    if (!isPatient && !isDoctor) throw new ApiError(403, "Not allowed to modify this appointment");

    // Auto-refund if a paid appointment is cancelled.
    if (
        status === "Cancelled" &&
        existing.status !== "Cancelled" &&
        existing.paymentStatus === "COMPLETED" &&
        (existing.totalAmount ?? 0) > 0
    ) {
        const refundDescription = `REFUND:APPOINTMENT:${id}`;
        await creditWalletAtomic(String(existing.patientId), Number(existing.totalAmount || 0), refundDescription);
    }

    let updateData: any = { status };

    // Calculate Commission if Completed
    if (status === "Completed" && existing.status !== "Completed") {
        const commissionPercentage = await getActiveCommissionRate(existing.doctorId.toString());
        const totalAmount = existing.totalAmount || 0;
        const commissionAmount = (totalAmount * commissionPercentage) / 100;
        const partnerEarning = totalAmount - commissionAmount;

        updateData.commissionPercentage = commissionPercentage;
        updateData.commissionAmount = commissionAmount;
        updateData.partnerEarning = partnerEarning;
    }

    const appointment = await doctorAppointmentModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate("doctorId")
        .populate("patientId");

    if (!appointment) throw new ApiError(404, "Appointment not found");

    const patient = await Patient.findById((appointment.patientId as any)?._id).select("fcmToken name email");
    const doctorName = (appointment.doctorId as any)?.name ?? "your doctor";

    const pushMap: Record<string, { title: string; body: string }> = {
        Confirmed: { title: "✅ Appointment Confirmed", body: `Your appointment with Dr. ${doctorName} is confirmed.` },
        Completed: { title: "💊 Consultation Complete", body: `Your consultation with Dr. ${doctorName} is done. How was it?` },
        Cancelled: { title: "❌ Appointment Cancelled", body: `Your appointment with Dr. ${doctorName} has been cancelled.` },
        CANCELLED: { title: "❌ Appointment Cancelled", body: `Your appointment with Dr. ${doctorName} has been cancelled.` },
    };

    // Sync with HospitalBooking if it exists
    if (status === "Cancelled" || status === "CANCELLED") {
        await HospitalBooking.findOneAndUpdate({ bookingId: id }, { status: "CANCELLED" });
    }

    const push = pushMap[status];
    if (push && patient) {
        await enqueuePush({
            recipientId: patient._id as mongoose.Types.ObjectId,
            recipientType: "patient",
            fcmToken: patient.fcmToken ?? null,
            title: push.title,
            body: push.body,
            data: { screen: "appointments", appointmentId: String(id) },
            refType: "DoctorAppointment",
            refId: new mongoose.Types.ObjectId(id as string),
        });

        // ── New: Send Status Update Email ─────────────────────────────────────
        if (patient.email) {
            try {
                const dateStr = appointment.date ? new Date(appointment.date).toDateString() : "Scheduled Date";
                const timeStr = appointment.startingTime || "Scheduled Time";
                await enqueueEmail({
                    kind: "appointment",
                    data: {
                        email: patient.email,
                        fullName: patient.name || "Customer",
                        serviceName: `Consultation with Dr. ${doctorName} [${status}]`,
                        date: dateStr,
                        time: timeStr,
                        location: "Confirmed via Mobile App",
                    },
                });
            } catch (e) {
                console.error("[Email] Status update email error:", e);
            }
        }
    }

    return res.status(200).json(new ApiResponse(200, "Appointment status updated", appointment));
});

/**
 * GET /api/doctor-appointment/consultation/:id/token
 * Allows the assigned patient or doctor to get ZegoCloud video call credentials for their consultation session.
 */
export const getConsultationCredentials = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized");

    const appointment = await doctorAppointmentModel.findById(id).populate("doctorId").populate("patientId");
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const isPatient = (appointment.patientId as any)?._id.toString() === userId.toString();
    const isDoctor = (appointment.doctorId as any)?._id.toString() === userId.toString();

    if (!isPatient && !isDoctor) {
        throw new ApiError(403, "You are not an authorized participant for this consultation");
    }

    if (appointment.status !== "Confirmed" && appointment.status !== "Completed") {
        throw new ApiError(400, "Consultation room is only available for active appointments");
    }

    // Read system settings for Zego config
    const store = await readConfigStore();
    const zego = store.system?.zego;
    if (!zego?.appId || !zego?.serverSecret) {
        throw new ApiError(500, "ZegoCloud video calling is not configured by the admin yet");
    }

    // Determine user role details
    const user = isPatient ? (appointment.patientId as any) : (appointment.doctorId as any);
    const userName = user?.name || "User";

    // Create a consultation payload
    return res.status(200).json(new ApiResponse(200, "Zego credentials retrieved", {
        appId: Number(zego.appId),
        appSign: zego.serverSecret,
        roomId: (appointment as any)._id.toString(),
        userId: userId.toString(),
        userName: userName
    }));
});
