import mongoose from "mongoose";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import serviceRequestModel from "./serviceRequest.model.js";
import serviceRequestValiation from "./serviceRequest.schema.js";
import { ChildServiceModel } from "../../Services/childService.model.js";
import { creditWalletAtomic, processPaymentFromWallet } from "../../Wallet/wallet.controller.js";
import DoctorModel from "../../Doctors/doctor.model.js";
import { Patient } from "../../Authentication/patient.model.js";
import { enqueueEmail, enqueuePush, enqueuePushToMany } from "../../../queues/communicationQueue.js";
import { scheduleBroadcastToAll } from "../../../queues/bookingQueue.js";

export const createServiceRequest = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized");

    const childSvc = await ChildServiceModel.findById(req.body.childServiceId);
    const hospitalFirst = !!childSvc?.hospitalProviderId;

    const payload = {
        ...req.body,
        userId,
        paymentStatus: req.body.paymentMode === 'ONLINE' ? 'COMPLETED' : 'PENDING',
        ...(hospitalFirst ? { notifiedHospitalAt: new Date() } : { broadcastedAt: new Date() }),
    };
    const checkServiceRequest = await serviceRequestModel.find({ userId: new mongoose.Types.ObjectId(userId) });
    if (checkServiceRequest.length > 10) {
        throw new ApiError(400, "Too many service requests");
    }
    const parsed = serviceRequestValiation.safeParse(payload);
    if (!parsed.success) {
        console.error("Validation failed!", parsed.error);
        throw new ApiError(400, "Validation failed!");
    }

    if (payload.paymentMode === 'ONLINE') {
        try {
            await processPaymentFromWallet(userId, payload.price, `Booking for ${payload.bookingType} service`);
        } catch (error: any) {
            throw new ApiError(400, error.message || "Payment failed");
        }
    }

    const newServiceRequest = new serviceRequestModel(payload);
    await newServiceRequest.save();

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
                    time: "In-Progress Verification",
                    location: patient.primaryAddressId ? "Stored Patient Address" : "Current Location",
                },
            });
        }
    } catch (e) {
        console.error("[Email] service booking email error:", e);
    }

    const serviceRequest = await serviceRequestModel
        .findById(newServiceRequest._id)
        .populate("childServiceId");
    const serviceName = (serviceRequest?.childServiceId as any)?.name ?? "a service";

    // ── Hospital-first: notify hospital only, then after 10s broadcast to all ─
    try {
        if (hospitalFirst && childSvc?.hospitalProviderId) {
            const hospital = await DoctorModel.findById(childSvc.hospitalProviderId).select("_id fcmToken");
            if (hospital) {
                await enqueuePush({
                    recipientId: hospital._id as mongoose.Types.ObjectId,
                    recipientType: "partner",
                    fcmToken: hospital.fcmToken ?? null,
                    title: "🏥 New booking — you have 10s priority",
                    body: `A new ${serviceName} booking — accept now before it goes to all providers.`,
                    data: { screen: "bookings", bookingId: String(newServiceRequest._id) },
                    refType: "ServiceRequest",
                    refId: newServiceRequest._id as mongoose.Types.ObjectId,
                });
            }
            await scheduleBroadcastToAll(String(newServiceRequest._id));
        } else if (childSvc?.allowedRoleIds?.length) {
            const matchingPartners = await DoctorModel.find({
                roleId: { $in: childSvc.allowedRoleIds },
                status: "Active",
                fcmToken: { $exists: true, $ne: null },
            }).select("_id fcmToken");
            await enqueuePushToMany(
                matchingPartners.map((p) => ({
                    recipientId: p._id as mongoose.Types.ObjectId,
                    recipientType: "partner" as const,
                    fcmToken: p.fcmToken ?? null,
                })),
                "🆕 New Job Available!",
                `A new ${serviceName} booking near you — tap to accept.`,
                { screen: "bookings", bookingId: String(newServiceRequest._id) },
                "ServiceRequest",
                newServiceRequest._id as mongoose.Types.ObjectId
            );
        }
    } catch (e) {
        console.error("[Push] broadcast error:", e);
    }

    return res.status(201).json(new ApiResponse(201, "Service booked", serviceRequest));
});

export const getServiceRequestByUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId format");

    const serviceRequests = await serviceRequestModel
        .find({ userId })
        .populate("userId")
        .populate("childServiceId");
    return res.status(200).json(new ApiResponse(200, "Got service", serviceRequests));
});

export const getPendingRequest = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const onGoingServices = await serviceRequestModel.find({
        userId: new mongoose.Types.ObjectId(userId!),
        status: { $in: ["PENDING", "BROADCASTED", "ACCEPTED", "IN_PROGRESS"] },
    }).populate("childServiceId");
    return res.status(200).json(new ApiResponse(200, "Ongoing fetched!", onGoingServices));
});

export const getSerivceRequestById = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    if (!requestId) throw new ApiError(401, "Please Provide request Id");
    const requestDetails = await serviceRequestModel.findOne({ _id: new mongoose.Types.ObjectId(requestId) });
    if (!requestDetails) throw new ApiError(404, "Service request not found");
    return res.status(200).json(new ApiResponse(200, "Request Found", requestDetails));
});

export const getServiceRequestForProvider = asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const providerId = req.user?.id;
    const { status } = req.query;
    if (!roleId) throw new ApiError(401, "No role id found");

    const childService = await ChildServiceModel.find({ allowedRoleIds: roleId });
    let requests: any[] = [];
    if (providerId && status !== "PENDING") {
        requests = await serviceRequestModel
            .find({ childServiceId: { $in: childService.map((item) => [item._id]) }, status })
            .populate("childServiceId")
            .populate("userId");
    } else {
        requests = await serviceRequestModel
            .find({ childServiceId: { $in: childService.map((item) => [item._id]) }, status: "PENDING" })
            .populate("childServiceId")
            .populate("userId");
    }
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

    // Auto-refund if a paid service booking is cancelled.
    if (
        status === "CANCELLED" &&
        existing.status !== "CANCELLED" &&
        existing.paymentStatus === "COMPLETED" &&
        (existing.price ?? 0) > 0
    ) {
        const refundDescription = `REFUND:SERVICE:${id}`;
        await creditWalletAtomic(String(existing.userId), Number(existing.price || 0), refundDescription);
    }

    const booking = await serviceRequestModel
        .findByIdAndUpdate(id, { status }, { new: true })
        .populate("childServiceId")
        .populate("userId");

    if (!booking) throw new ApiError(404, "Service request not found");

    const serviceName = (booking.childServiceId as any)?.name ?? "service";
    const patient = booking.userId as any;
    const patientFull = await Patient.findById(patient?._id).select("fcmToken name email");

    const pushMap: Record<string, { title: string; body: string }> = {
        ACCEPTED: { title: "✅ Provider Accepted!", body: `Your ${serviceName} booking has been accepted.` },
        IN_PROGRESS: { title: "🚀 Service Started", body: `Your ${serviceName} is now in progress.` },
        COMPLETED: { title: "🎉 Service Completed", body: `Your ${serviceName} is done. Rate your experience!` },
        CANCELLED: { title: "❌ Booking Cancelled", body: `Your ${serviceName} booking has been cancelled.` },
        RETURNED_TO_ADMIN: { title: "⏳ Still Searching…", body: "We're still finding a provider. Hang tight!" },
    };

    const push = pushMap[status];
    if (push && patientFull) {
        await enqueuePush({
            recipientId: patientFull._id as mongoose.Types.ObjectId,
            recipientType: "patient",
            fcmToken: patientFull.fcmToken ?? null,
            title: push.title,
            body: push.body,
            data: { screen: "bookings", bookingId: String(id) },
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

    return res.status(200).json(new ApiResponse(200, "Status updated", booking));
});
