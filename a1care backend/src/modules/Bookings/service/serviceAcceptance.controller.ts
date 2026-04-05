import mongoose from "mongoose";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import serviceAcceptanceModal from "./serviceAcceptance.model.js";
import serviceAcceptanceValidation from "./serviceAcceptance.schema.js";
import serviceRequestModel from "./serviceRequest.model.js";
import PartnerSubscription from "../../PartnerSubscription/subscription.model.js";
import { Patient } from "../../Authentication/patient.model.js";
import DoctorModel from "../../Doctors/doctor.model.js";
import { enqueuePush } from "../../../queues/communicationQueue.js";

// Partner accepts a service request
export const createServiceAcceptance = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    const { serviceRequestId } = req.params;

    if (!providerId) throw new ApiError(401, "Unauthorized");
    if (!serviceRequestId) throw new ApiError(400, "serviceRequestId is required");

    // 1. Check Subscription
    const activeSub = await PartnerSubscription.findOne({
        partnerId: providerId,
        status: "Active",
        endDate: { $gte: new Date() }
    });
    if (!activeSub) {
        throw new ApiError(403, "Active subscription required to accept jobs.");
    }

    // 2. Fetch Service Request and Provider Details
    const serviceRequestDetails = await serviceRequestModel
        .findById(serviceRequestId)
        .populate("userId");

    if (!serviceRequestDetails) {
        throw new ApiError(404, "Service Request not found");
    }

    // Check if wait time for hospital (notifiedHospitalAt) has passed if someone else than the hospital is accepting
    // For now, let's just check the state
    if (serviceRequestDetails.status !== "PENDING" && serviceRequestDetails.status !== "BROADCASTED") {
        throw new ApiError(404, "Service Request already accepted or cancelled");
    }

    const provider = await DoctorModel.findById(providerId);
    if (!provider) throw new ApiError(404, "Provider not found");

    // 3. Build Payload for validation
    const payload = {
        ...req.body,
        serviceRequestId: String(serviceRequestId),
        providerId: String(providerId),
        patientId: String(serviceRequestDetails.userId?._id || serviceRequestDetails.userId),
        price: Number(serviceRequestDetails.price),
        roleId: provider.roleId ? String(provider.roleId) : undefined,
        status: "ACCEPTED"
    };

    const parsed = serviceAcceptanceValidation.safeParse(payload);
    if (!parsed.success) {
        console.error("Acceptance Validation failed!", parsed.error);
        throw new ApiError(401, `Validation failed: ${parsed.error.errors[0].message}`);
    }

    // 4. Update request status
    await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
        $set: { status: "ACCEPTED", assignedProviderId: new mongoose.Types.ObjectId(providerId!) },
    });

    // 5. Create acceptance record
    const newAcceptance = new serviceAcceptanceModal(parsed.data);
    await newAcceptance.save();

    // ── Push: notify the customer their booking was accepted ─────────────────
    try {
        const patient = await Patient.findById((serviceRequestDetails.userId as any)?._id).select("fcmToken name");
        const providerName = provider.name || "A provider";

        if (patient) {
            await enqueuePush({
                recipientId: patient._id as mongoose.Types.ObjectId,
                recipientType: "patient",
                fcmToken: patient.fcmToken ?? null,
                title: "✅ Provider Accepted!",
                body: `${providerName} has accepted your booking.`,
                data: { screen: "bookings", bookingId: serviceRequestId },
                refType: "ServiceRequest",
                refId: new mongoose.Types.ObjectId(serviceRequestId),
            });
        }
    } catch (e) {
        console.error("[Push] acceptance push error:", e);
    }

    return res.status(201).json(new ApiResponse(201, "Accepted your service", newAcceptance));
});

// Partner rejects a service request
export const createServiceRejected = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    const { requestId } = req.params;
    if (!requestId) throw new ApiError(401, "Request id not found");

    const serviceRequestDetails = await serviceRequestModel.findById(requestId);
    if (!serviceRequestDetails) throw new ApiError(404, "Service request not found");

    const provider = await DoctorModel.findById(providerId);
    if (!provider) throw new ApiError(404, "Provider not found");

    const payload = {
        ...req.body,
        providerId: String(providerId),
        serviceRequestId: String(requestId),
        patientId: String(serviceRequestDetails.userId),
        price: Number(serviceRequestDetails.price),
        roleId: String(provider.roleId || ""),
        status: "REJECTED",
    };

    const parsed = serviceAcceptanceValidation.safeParse(payload);
    if (!parsed.success) {
        console.log("Error in validation:", parsed.error);
        throw new ApiError(401, "Error in validations!");
    }

    const createRejected = new serviceAcceptanceModal(parsed.data);
    await createRejected.save();
    return res.status(201).json(new ApiResponse(201, "Rejected the request", createRejected));
});
