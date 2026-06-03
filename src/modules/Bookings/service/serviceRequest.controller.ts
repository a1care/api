import mongoose from "mongoose";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import serviceRequestModel from "./serviceRequest.model.js";
import serviceRequestValiation from "./serviceRequest.schema.js";
import { ChildServiceModel } from "../../Services/childService.model.js";
import { creditWalletAtomic, processPaymentFromWallet } from "../../Wallet/wallet.controller.js";
import { Patient } from "../../Authentication/patient.model.js";
import { enqueueEmail, enqueuePush } from "../../../queues/communicationQueue.js";
import { HealthPackageModel } from "../../HealthPackages/healthPackage.model.js";
import HospitalBooking from "../hospitalBooking.model.js";
import { getActiveCommissionRate } from "../../PartnerSubscription/subscription.controller.js";
import { emitToRoom } from "../../../socket.js";
import { validateCoupon, consumeCoupon } from "../../Coupons/coupon.controller.js";
import { applyReferralReward } from "../../Referral/referral.controller.js";
import { notifyAdmin } from "../../Notifications/notification.controller.js";


export const createServiceRequest = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized");

    // Only patients may create bookings — a partner/staff token must not create a phantom patient booking.
    if (req.user?.role !== "Patient") throw new ApiError(403, "Only patients can create bookings");

    let childSvc = null;
    let healthPkg = null;

    if (req.body.childServiceId) {
        childSvc = await ChildServiceModel.findById(req.body.childServiceId);
    } else if (req.body.healthPackageId) {
        healthPkg = await HealthPackageModel.findById(req.body.healthPackageId);
    }

    if (!childSvc && !healthPkg) throw new ApiError(404, "Service or Package not found");

    const basePrice = childSvc?.price ?? healthPkg?.price ?? 0;
    const bookingName = childSvc?.name ?? healthPkg?.name ?? "Service";

    // ── Optional coupon: VALIDATE ONLY here (consume after the booking is saved &
    //    payment confirmed, so a failed payment never burns the customer's coupon) ──
    let discountAmount = 0;
    let appliedCouponCode: string | undefined;
    let couponToConsume: { couponId: string; usageLimit: number; usagePerUser: number } | null = null;
    if (req.body.couponCode) {
        const applied = await validateCoupon(req.body.couponCode, userId, basePrice, "SERVICE");
        discountAmount = applied.discountAmount;
        appliedCouponCode = applied.couponCode;
        couponToConsume = { couponId: applied.couponId, usageLimit: applied.usageLimit, usagePerUser: applied.usagePerUser };
    }
    const finalPrice = Math.max(0, basePrice - discountAmount);

    // Backward compatibility for live app payloads where scheduledSlot endTime equals startTime.
    // Normalize to a default 30-minute slot to avoid validation failure.
    const normalizeScheduledSlot = (slot: any) => {
        if (!slot?.startTime) return slot;
        const start = new Date(slot.startTime);
        if (Number.isNaN(start.getTime())) return slot;

        const endRaw = slot?.endTime ? new Date(slot.endTime) : null;
        if (!endRaw || Number.isNaN(endRaw.getTime()) || endRaw.getTime() <= start.getTime()) {
            const fixedEnd = new Date(start.getTime() + 30 * 60 * 1000);
            return { ...slot, startTime: start, endTime: fixedEnd };
        }
        return { ...slot, startTime: start, endTime: endRaw };
    };

    const payload = {
        ...req.body,
        scheduledSlot: normalizeScheduledSlot(req.body?.scheduledSlot),
        userId,
        price: finalPrice,
        couponCode: appliedCouponCode,
        discountAmount,
        bookingType: (childSvc as any)?.bookingType ?? "SCHEDULED", // Default for health packages
        fulfillmentMode: (childSvc as any)?.fulfillmentMode ?? "HOME_VISIT", // Default for health packages
        // SECURITY: never trust isGatewayPayment from the client. An ONLINE booking is paid
        // from the wallet here; the wallet itself is funded via the verified gateway top-up
        // flow (/wallet/initiate + /wallet/response). Forcing this false closes the
        // "isGatewayPayment:true ⇒ free booking marked COMPLETED" exploit.
        isGatewayPayment: false,
        paymentStatus: req.body.paymentMode === 'ONLINE' ? 'COMPLETED' : 'PENDING',
        status: "PENDING",
    };

    const parsed = serviceRequestValiation.safeParse(payload);
    if (!parsed.success) {
        console.error("Validation failed!", parsed.error);
        throw new ApiError(400, "Validation failed: " + (parsed.error as any).errors.map((e: any) => `${e.path?.join('.') || ''}: ${e.message}`).join(', '));
    }

    if (payload.paymentMode === 'ONLINE') {
        try {
            await processPaymentFromWallet(userId, finalPrice, `Booking for ${bookingName}`);
        } catch (error: any) {
            await notifyAdmin(
                "⚠️ Booking Payment Failed",
                `A wallet payment of ₹${finalPrice} for "${bookingName}" failed.`,
                "Wallet",
                String(userId)
            );
            throw new ApiError(400, error.message || "Payment from wallet failed");
        }
    }

    const newServiceRequest = new serviceRequestModel(payload);
    try {
        await newServiceRequest.save();
    } catch (saveErr: any) {
        // The wallet was already debited above — if persisting the booking fails we must
        // refund so the patient never loses money for a booking that doesn't exist.
        if (payload.paymentMode === "ONLINE" && finalPrice > 0) {
            await creditWalletAtomic(userId, finalPrice, `REFUND:BOOKING_SAVE_FAILED:${userId}:${Date.now()}`);
        }
        console.error("[Booking] save failed after payment — refunded:", saveErr);
        throw new ApiError(500, "Could not create your booking. Any amount charged has been refunded to your wallet.");
    }

    // ── Consume the coupon now that payment + booking both succeeded ──
    if (couponToConsume) {
        try {
            await consumeCoupon(couponToConsume.couponId, userId, couponToConsume.usageLimit, couponToConsume.usagePerUser);
        } catch (couponErr: any) {
            // Lost a race for the last redemption — undo the booking & refund so we don't
            // leave a discounted booking against a coupon that was never charged. Any paid
            // amount (wallet OR gateway) is refunded to the patient's wallet, consistent
            // with how every other refund in the app is issued.
            await serviceRequestModel.findByIdAndDelete(newServiceRequest._id);
            if (payload.paymentMode === "ONLINE" && finalPrice > 0) {
                await creditWalletAtomic(userId, finalPrice, `REFUND:COUPON_RACE:${newServiceRequest._id}`);
            }
            throw new ApiError(400, couponErr?.message || "This coupon can no longer be used");
        }
    }

    // NOTE (by design): a coupon and a referral code may both be applied to the same
    // booking. They affect different parties — the coupon discounts THIS customer's price,
    // the referral rewards a DIFFERENT user (the referrer). They are independent acquisition
    // costs and do not compound against the same amount, so stacking is intentionally allowed.
    if (req.body.referralCode) {
        try { await applyReferralReward(userId, req.body.referralCode, String(newServiceRequest._id)); }
        catch (e) { console.error("[Referral] reward error:", e); }
    }

    // ── Send Confirmation Email ─────────────────────────────────────────────
    try {
        const patient = await Patient.findById(userId);
        if (patient?.email) {
            await enqueueEmail({
                kind: "appointment",
                data: {
                    email: patient.email,
                    fullName: patient.name || "Customer",
                    serviceName: payload.bookingType || "Home Care Service",
                    date: new Date().toDateString(),
                    time: "Awaiting admin assignment",
                    location: patient.primaryAddressId ? "Stored Patient Address" : "Current Location",
                },
            });
        }
    } catch (e) {
        console.error("[Email] service booking email error:", e);
    }

    const serviceRequest = await serviceRequestModel
        .findById(newServiceRequest._id)
        .populate("childServiceId")
        .populate("healthPackageId")
        .populate("addressId");
    return res.status(201).json(new ApiResponse(201, "Service booked", serviceRequest));
});

export const getServiceRequestByUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId format");

    const serviceRequests = await serviceRequestModel
        .find({ userId })
        .populate("userId")
        .populate("childServiceId")
        .populate("addressId");
    return res.status(200).json(new ApiResponse(200, "Got service", serviceRequests));
});

export const getPendingRequest = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const onGoingServices = await serviceRequestModel.find({
        userId: new mongoose.Types.ObjectId(userId!),
        status: { $in: ["PENDING", "BROADCASTED", "ACCEPTED", "IN_PROGRESS"] },
    }).populate("childServiceId").populate("addressId");
    return res.status(200).json(new ApiResponse(200, "Ongoing fetched!", onGoingServices));
});

export const getSerivceRequestById = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    if (!requestId) throw new ApiError(401, "Please Provide request Id");
    const requestDetails = await serviceRequestModel
        .findOne({ _id: new mongoose.Types.ObjectId(requestId) })
        .populate("childServiceId")
        .populate("healthPackageId")
        .populate("addressId");
    if (!requestDetails) throw new ApiError(404, "Service request not found");
    return res.status(200).json(new ApiResponse(200, "Request Found", requestDetails));
});

export const getServiceRequestForProvider = asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const providerId = req.user?.id;
    const { status } = req.query;
    if (!roleId) throw new ApiError(401, "No role id found");
    if (!providerId) throw new ApiError(401, "Unauthorized");

    const childService = await ChildServiceModel.find({ allowedRoleIds: roleId });
    const providerStatuses = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RETURNED_TO_ADMIN"];
    let requests: any[] = [];

    const query: any = {
        childServiceId: { $in: childService.map((item) => item._id) },
        assignedProviderId: new mongoose.Types.ObjectId(providerId),
    };

    if (typeof status === "string" && providerStatuses.includes(status)) {
        query.status = status;
    } else {
        query.status = { $in: ["ACCEPTED", "IN_PROGRESS"] };
    }

    requests = await serviceRequestModel
        .find(query)
        .populate("childServiceId")
        .populate("userId")
        .populate("addressId");

    return res.status(200).json(new ApiResponse(200, "Fetched requests", requests));
});

/**
 * PATCH /api/service/booking/:id/status
 * Used by admin or partner to update booking status → triggers push to customer.
 */
export const updateServiceRequestStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new ApiError(400, "status is required");

    const existing = await serviceRequestModel.findById(id);
    if (!existing) throw new ApiError(404, "Service request not found");

    const requesterId = req.user?.id;
    if (!requesterId) throw new ApiError(401, "Not authorized");

    const isPatient = existing.userId?.toString() === requesterId.toString();
    const isAssignedProvider = existing.assignedProviderId?.toString() === requesterId.toString();
    if (!isPatient && !isAssignedProvider) throw new ApiError(403, "Not allowed to update this booking");

    // Guard: cannot cancel a booking already in progress / completed / cancelled
    const NON_CANCELLABLE = ["IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (status === "CANCELLED" && NON_CANCELLABLE.includes(existing.status)) {
        throw new ApiError(400, `Cannot cancel a booking that is already ${existing.status}`);
    }

    // Auto-refund if a paid service booking is cancelled.
    let didRefund = false;
    if (
        status === "CANCELLED" &&
        existing.status !== "CANCELLED" &&
        (existing as any).paymentStatus === "COMPLETED" &&
        (existing.price ?? 0) > 0
    ) {
        const refundDescription = `REFUND:SERVICE:${id}`;
        await creditWalletAtomic(String(existing.userId), Number(existing.price || 0), refundDescription);
        didRefund = true;
    }

    let updateData: any = { status };

    // Calculate Commission if Completed
    if (status === "COMPLETED" && existing.status !== "COMPLETED" && existing.assignedProviderId) {
        const commissionPercentage = await getActiveCommissionRate(existing.assignedProviderId.toString());
        const totalPrice = existing.price || 0;
        const commissionAmount = (totalPrice * commissionPercentage) / 100;
        const partnerEarning = totalPrice - commissionAmount;

        updateData.commissionPercentage = commissionPercentage;
        updateData.commissionAmount = commissionAmount;
        updateData.partnerEarning = partnerEarning;
    }

    const booking = await serviceRequestModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate("childServiceId")
        .populate("userId")
        .populate("addressId");

    if (!booking) throw new ApiError(404, "Service request not found");

    const serviceName = (booking.childServiceId as any)?.name ?? "service";
    const patient = booking.userId as any;
    const patientFull = await Patient.findById(patient?._id).select("fcmToken name email");

    const pushMap: Record<string, { title: string; body: string }> = {
        ACCEPTED: { title: "✅ Provider Accepted!", body: `Your ${serviceName} booking has been accepted.` },
        IN_PROGRESS: { title: "🚀 Service Started", body: `Your ${serviceName} is now in progress.` },
        COMPLETED: { title: "🎉 Service Completed", body: `Your ${serviceName} is done. Rate your experience!` },
        CANCELLED: { title: "❌ Booking Cancelled", body: `Your ${serviceName} booking has been cancelled.` },
        Cancelled: { title: "❌ Booking Cancelled", body: `Your ${serviceName} booking has been cancelled.` },
        RETURNED_TO_ADMIN: { title: "⏳ Still Searching…", body: "We're still finding a provider. Hang tight!" },
    };

    // Sync with HospitalBooking if it exists
    if (status === "CANCELLED" || status === "Cancelled") {
        await HospitalBooking.findOneAndUpdate({ bookingId: id }, { status: "CANCELLED" });
    }

    // Real-time status push to booking room
    emitToRoom(String(id), 'booking_status_updated', { bookingId: String(id), status });

    const push = pushMap[status];
    if (push && patientFull) {
        await enqueuePush({
            recipientId: patientFull._id as mongoose.Types.ObjectId,
            recipientType: "patient",
            fcmToken: patientFull.fcmToken ?? null,
            title: push.title,
            body: push.body,
            data: { screen: `/booking/${id}` },
            refType: "ServiceRequest",
            refId: booking._id as mongoose.Types.ObjectId,
        });

        // ── New: Send Status Update Email ─────────────────────────────────────
        if (patientFull.email) {
            try {
                await enqueueEmail({
                    kind: "appointment",
                    data: {
                        email: patientFull.email,
                        fullName: patientFull.name || "Customer",
                        serviceName: `${serviceName} [${status}]`,
                        date: new Date().toDateString(),
                        time: "Service Update",
                        location: "Confirmed Location",
                    },
                });
            } catch (e) {
                console.error("[Email] Status update email error:", e);
            }
        }
    }

    // ── Refund confirmation email (only if money was actually returned) ──
    if (didRefund && patientFull?.email) {
        try {
            await enqueueEmail({
                kind: "refund",
                data: {
                    email: patientFull.email,
                    fullName: patientFull.name || "Customer",
                    amount: Number(existing.price || 0),
                    serviceName,
                    bookingId: String(id),
                },
            });
        } catch (e) {
            console.error("[Email] service refund email error:", e);
        }
    }

    // ── Service completed email ──
    if (status === "COMPLETED" && existing.status !== "COMPLETED" && patientFull?.email) {
        try {
            let partnerName = "A1Care Provider";
            if (booking.assignedProviderId) {
                const DoctorMdl = (await import("../../Doctors/doctor.model.js")).default;
                const provider = await DoctorMdl.findById(booking.assignedProviderId).select("name");
                if (provider?.name) partnerName = provider.name;
            }
            await enqueueEmail({
                kind: "service_completed",
                data: {
                    email: patientFull.email,
                    fullName: patientFull.name || "Customer",
                    serviceName,
                    partnerName,
                    amount: Number(booking.price || 0),
                    date: new Date().toDateString(),
                },
            });
        } catch (e) {
            console.error("[Email] service completed email error:", e);
        }
    }

    return res.status(200).json(new ApiResponse(200, "Status updated", booking));
});
