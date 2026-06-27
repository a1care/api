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
import { emitToRoom } from "../../socket.js";
import { validateCoupon, consumeCoupon } from "../Coupons/coupon.controller.js";
import { notifyAdmin } from "../Notifications/notification.controller.js";
import { applyReferralReward } from "../Referral/referral.controller.js";
import { cancelAppointmentReminder } from "../../queues/bookingQueue.js";
import DoctorAvailability from "../Doctors/slots/doctorAvailability.model.js";
import DoctorBlockTime from "../Doctors/slots/blockTime.model.js";


export const createDoctorAppointment = asyncHandler(async (req, res) => {
    const patientId = req.user?.id;
    if (!patientId) throw new ApiError(401, "Not authorized");

    // Only patients may create bookings — a partner/staff token must not create a phantom patient booking.
    if (req.user?.role !== "Patient") throw new ApiError(403, "Only patients can create bookings");

    const { doctorId } = req.params;
    if (!doctorId) throw new ApiError(400, "Doctor ID is required");

    let totalAmount = req.body.totalAmount;
    const doctor = await DoctorModel.findById(doctorId);
    if (!totalAmount && doctor) totalAmount = doctor.consultationFee;
    if (totalAmount === undefined || totalAmount === null) throw new ApiError(400, "Consultation fee not found");

    const baseAmount = Number(totalAmount);

    // ── Coupon: VALIDATE ONLY here. Consume only after booking + payment succeed
    //    so a failed payment never burns the customer's coupon. ──
    let appliedCouponCode: string | undefined;
    let discountAmount = 0;
    let couponToConsume: { couponId: string; usageLimit: number; usagePerUser: number } | null = null;
    if (req.body.couponCode) {
        const couponResult = await validateCoupon(
            req.body.couponCode,
            patientId,
            baseAmount,
            "DOCTOR"
        );
        discountAmount = couponResult.discountAmount;
        appliedCouponCode = couponResult.couponCode;
        couponToConsume = { couponId: couponResult.couponId, usageLimit: couponResult.usageLimit, usagePerUser: couponResult.usagePerUser };
    }

    totalAmount = Math.max(0, baseAmount - discountAmount);

    const payload = {
        ...req.body,
        doctorId,
        patientId,
        totalAmount,
        couponCode: appliedCouponCode,
        discountAmount,
        paymentStatus: req.body.paymentMode === 'ONLINE' ? 'COMPLETED' : 'PENDING',
    };

    const parsed = doctorAppoinmentValidations.safeParse(payload);
    if (!parsed.success) {
        console.error("Error in creating doctor appointment", parsed.error);
        throw new ApiError(400, `Validation failed! ${parsed.error}`);
    }

    // ── Slot conflict: same doctor, same date+time, not cancelled ───────────
    const conflict = await doctorAppointmentModel.findOne({
        doctorId,
        date: parsed.data.date,
        startingTime: parsed.data.startingTime,
        status: { $nin: ["Cancelled", "CANCELLED"] },
    });
    if (conflict) {
        throw new ApiError(409, "This time slot is already booked. Please choose a different time.");
    }

    // ── Doctor availability check ────────────────────────────────────────────
    const apptDate = new Date(parsed.data.date);
    const weekDay = apptDate.getDay(); // 0=Sun … 6=Sat

    const availability = await DoctorAvailability.findOne({ doctorId });
    if (availability) {
        if (!availability.weekDays.includes(weekDay)) {
            throw new ApiError(400, "The doctor is not available on this day. Please pick another date.");
        }
        // Simple HH:MM string comparison (both sides are "HH:MM" format)
        const apptStart = parsed.data.startingTime;
        if (apptStart < availability.startingTime || apptStart >= availability.endingTime) {
            throw new ApiError(400, `The doctor is only available between ${availability.startingTime} and ${availability.endingTime}.`);
        }
    }

    // ── Block time check (specific date or weekday block) ────────────────────
    const blockForDate = await DoctorBlockTime.findOne({
        doctorId,
        $or: [
            { date: apptDate },
            { weekDays: weekDay },
        ],
    });
    if (blockForDate) {
        const apptStart = parsed.data.startingTime;
        const overlapsBock =
            apptStart >= blockForDate.startingTime && apptStart < blockForDate.endingTime;
        if (overlapsBock) {
            throw new ApiError(400, `The doctor is unavailable at this time (${blockForDate.reason}). Please choose another slot.`);
        }
    }

    if (payload.paymentMode === 'WALLET') {
        try {
            await processPaymentFromWallet(patientId, totalAmount, `Booking for Dr. ${payload.doctorId}`);
        } catch (error: any) {
            await notifyAdmin(
                "⚠️ Appointment Payment Failed",
                `A wallet payment of ₹${totalAmount} for a doctor consultation failed.`,
                "Wallet",
                String(patientId)
            );
            throw new ApiError(400, error.message || "Payment failed");
        }
    }

    const newAppointment = new doctorAppointmentModel(parsed.data);
    try {
        await newAppointment.save();
    } catch (saveErr: any) {
        // Wallet already debited above — refund if persisting the appointment fails.
        if (payload.paymentMode === "WALLET" && totalAmount > 0) {
            await creditWalletAtomic(patientId, totalAmount, `REFUND:BOOKING_SAVE_FAILED:${patientId}:${Date.now()}`);
        }
        console.error("[Appointment] save failed after payment — refunded:", saveErr);
        throw new ApiError(500, "Could not create your appointment. Any amount charged has been refunded to your wallet.");
    }

    // ── Consume the coupon now that payment + booking both succeeded ──
    if (couponToConsume) {
        try {
            await consumeCoupon(couponToConsume.couponId, patientId, couponToConsume.usageLimit, couponToConsume.usagePerUser);
        } catch (couponErr: any) {
            // Lost a race for the last redemption — undo booking & refund.
            await doctorAppointmentModel.findByIdAndDelete(newAppointment._id);
            if (payload.paymentMode === "WALLET" && totalAmount > 0) {
                await creditWalletAtomic(patientId, totalAmount, `REFUND:COUPON_RACE:${newAppointment._id}`);
            }
            throw new ApiError(400, couponErr?.message || "This coupon can no longer be used");
        }
    }

    // Reward the referrer if a referral code was supplied (parity with service bookings)
    if (req.body.referralCode) {
        try { await applyReferralReward(patientId, req.body.referralCode, String(newAppointment._id)); }
        catch (e) { console.error("[Referral] reward error:", e); }
    }

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
                data: { screen: `/booking/${newAppointment._id}` },
                refType: "DoctorAppointment",
                refId: newAppointment._id as mongoose.Types.ObjectId,
            });
        }
    } catch (e) {
        console.error("[Push] doctor appointment push error:", e);
    }

    // Schedule 24-hour reminder push for both doctor and patient
    try {
        const apptTimestamp = new Date(`${parsed.data.date} ${parsed.data.startingTime}`).getTime();
        if (!Number.isNaN(apptTimestamp)) {
            const { scheduleAppointmentReminder } = await import("../../queues/bookingQueue.js");
            await scheduleAppointmentReminder(String(newAppointment._id), apptTimestamp);
        }
    } catch (e) {
        console.error("[Reminder] schedule error:", e);
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
    let didRefund = false;
    if (
        status === "Cancelled" &&
        existing.status !== "Cancelled" &&
        existing.paymentStatus === "COMPLETED" &&
        (existing.totalAmount ?? 0) > 0
    ) {
        const refundDescription = `REFUND:APPOINTMENT:${id}`;
        await creditWalletAtomic(String(existing.patientId), Number(existing.totalAmount || 0), refundDescription);
        didRefund = true;
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

    // Sync with HospitalBooking if it exists; also cancel the reminder job
    if (status === "Cancelled" || status === "CANCELLED") {
        await HospitalBooking.findOneAndUpdate({ bookingId: id }, { status: "CANCELLED" });
        cancelAppointmentReminder(String(id)).catch(() => {});
    }

    // Real-time status push to booking room
    emitToRoom(String(id), 'booking_status_updated', { bookingId: String(id), status });

    const push = pushMap[status];
    if (push && patient) {
        await enqueuePush({
            recipientId: patient._id as mongoose.Types.ObjectId,
            recipientType: "patient",
            fcmToken: patient.fcmToken ?? null,
            title: push.title,
            body: push.body,
            data: { screen: `/booking/${id}` },
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

    // ── Refund confirmation email (only if money was actually returned) ──
    if (didRefund && patient?.email) {
        try {
            await enqueueEmail({
                kind: "refund",
                data: {
                    email: patient.email,
                    fullName: patient.name || "Customer",
                    amount: Number(existing.totalAmount || 0),
                    serviceName: `Consultation with Dr. ${doctorName}`,
                    bookingId: String(id),
                },
            });
        } catch (e) {
            console.error("[Email] appointment refund email error:", e);
        }
    }

    // ── Service completed email ──
    if (status === "Completed" && existing.status !== "Completed" && patient?.email) {
        try {
            await enqueueEmail({
                kind: "service_completed",
                data: {
                    email: patient.email,
                    fullName: patient.name || "Customer",
                    serviceName: `Consultation with Dr. ${doctorName}`,
                    partnerName: `Dr. ${doctorName}`,
                    amount: Number(appointment.totalAmount || 0),
                    date: appointment.date ? new Date(appointment.date).toDateString() : new Date().toDateString(),
                },
            });
        } catch (e) {
            console.error("[Email] appointment completed email error:", e);
        }
    }

    return res.status(200).json(new ApiResponse(200, "Appointment status updated", appointment));
});


export const getAppointmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Appointment ID is required");

    const appointment = await doctorAppointmentModel.findById(id)
        .populate("doctorId")
        .populate("patientId");

    if (!appointment) throw new ApiError(404, "Appointment not found");

    return res.status(200).json(new ApiResponse(200, "Appointment fetched", appointment));
});

/**
 * Called by the booking worker 24 hours before an appointment.
 * Pushes reminder to both the patient and the doctor.
 */
export const markAppointmentCashCollected = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doctorId = req.user?.id;
    if (!doctorId) throw new ApiError(401, "Not authorized");

    const appt = await doctorAppointmentModel.findById(id);
    if (!appt) throw new ApiError(404, "Appointment not found");
    if (appt.doctorId.toString() !== doctorId) throw new ApiError(403, "Not your appointment");
    if (appt.paymentMode !== "OFFLINE") throw new ApiError(400, "Only cash appointments can be marked as collected");
    if (appt.paymentStatus === "COMPLETED") throw new ApiError(400, "Cash already marked as collected");

    await doctorAppointmentModel.findByIdAndUpdate(id, { paymentStatus: "COMPLETED" });

    const patient = await Patient.findById(appt.patientId).select("fcmToken name").lean();
    if (patient) {
        enqueuePush({
            recipientId: appt.patientId as mongoose.Types.ObjectId,
            recipientType: "patient",
            fcmToken: (patient as any).fcmToken ?? null,
            title: "Payment Received",
            body: "Your cash payment for the consultation has been confirmed. Thank you!",
            data: { screen: `/booking/${id}` },
            refType: "DoctorAppointment",
            refId: new mongoose.Types.ObjectId(id as string),
        }).catch(() => {});
    }

    return res.status(200).json(new ApiResponse(200, "Cash collection confirmed", null));
});

export async function runAppointmentReminder(appointmentId: string): Promise<void> {
    const appointment = await doctorAppointmentModel
        .findById(appointmentId)
        .populate("doctorId", "name fcmToken")
        .populate("patientId", "name fcmToken");

    if (!appointment || !["Pending", "Confirmed"].includes(appointment.status)) return;

    const patient = appointment.patientId as any;
    const doctor = appointment.doctorId as any;
    const dateStr = appointment.date ? new Date(appointment.date).toDateString() : "tomorrow";
    const timeStr = appointment.startingTime || "your scheduled time";

    if (patient?.fcmToken) {
        await enqueuePush({
            recipientId: patient._id,
            recipientType: "patient",
            fcmToken: patient.fcmToken,
            title: "⏰ Appointment Reminder",
            body: `You have a consultation with Dr. ${doctor?.name ?? "your doctor"} tomorrow (${dateStr}) at ${timeStr}.`,
            data: { screen: `/doctor/appointment/${appointmentId}` },
            refType: "DoctorAppointment",
            refId: new mongoose.Types.ObjectId(appointmentId),
        });
    }

    if (doctor?.fcmToken) {
        await enqueuePush({
            recipientId: doctor._id,
            recipientType: "Partner",
            fcmToken: doctor.fcmToken,
            title: "📅 Appointment Tomorrow",
            body: `Reminder: consultation with ${patient?.name ?? "a patient"} on ${dateStr} at ${timeStr}.`,
            data: { bookingId: appointmentId, screen: "bookings" },
            refType: "DoctorAppointment",
            refId: new mongoose.Types.ObjectId(appointmentId),
        });
    }
}
