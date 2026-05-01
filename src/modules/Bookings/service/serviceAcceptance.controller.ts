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

    const serviceRequestDetails = await serviceRequestModel
        .findById(serviceRequestId)
        .populate("userId");

    if (!serviceRequestDetails || (serviceRequestDetails.status !== "PENDING" && serviceRequestDetails.status !== "BROADCASTED")) {
        throw new ApiError(404, "Service Request not found or already accepted");
    }

    const providerDetails = await DoctorModel.findById(providerId);
    if (!providerDetails) throw new ApiError(404, "Provider details not found");

    const payload = { 
        ...req.body, 
        serviceRequestId, 
        providerId,
        roleId: req.body.roleId || serviceRequestDetails.assignedRoleId?.toString() || providerDetails.roleId?.toString(),
        patientId: (serviceRequestDetails.userId as any)?._id?.toString(),
        price: serviceRequestDetails.price || 0,
        status: "ACCEPTED"
    };

    const parsed = serviceAcceptanceValidation.safeParse(payload);
    if (!parsed.success) {
        console.error("Validation failed!", parsed.error);
        const firstError = parsed.error.issues[0]?.message || "Validation failed";
        throw new ApiError(400, `Validation failed: ${firstError}`);
    }

    // Subscription Check
    const activeSub = await PartnerSubscription.findOne({
        partnerId: providerId,
        status: "Active",
        endDate: { $gte: new Date() }
    });
    if (!activeSub) {
        throw new ApiError(403, "Active subscription required to accept jobs.");
    }

    // Update request status
    await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
        $set: { status: "ACCEPTED", assignedProviderId: new mongoose.Types.ObjectId(providerId!) },
    });

    // Create acceptance record
    const newAcceptance = new serviceAcceptanceModal(parsed.data);
    await newAcceptance.save();

    // ── Push: notify the customer their booking was accepted ─────────────────
    try {
        const patient = await Patient.findById((serviceRequestDetails.userId as any)?._id).select("fcmToken name");
        const provider = await DoctorModel.findById(providerId).select("name");

        if (patient) {
            await enqueuePush({
                recipientId: patient._id as mongoose.Types.ObjectId,
                recipientType: "patient",
                fcmToken: patient.fcmToken ?? null,
                title: "✅ Provider Accepted!",
                body: `${provider?.name ?? "A provider"} has accepted your booking.`,
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
    if (!serviceRequestDetails) throw new ApiError(404, "Service Request not found");

    const providerDetails = await DoctorModel.findById(providerId);
    
    const payload = {
        ...req.body,
        providerId,
        serviceRequestId: requestId,
        roleId: req.body.roleId || (serviceRequestDetails as any).assignedRoleId?.toString() || providerDetails?.roleId?.toString(),
        patientId: (serviceRequestDetails.userId as any)?.toString(),
        price: serviceRequestDetails.price || 0,
        status: "REJECTED",
    };

    const parsed = serviceAcceptanceValidation.safeParse(payload);
    if (!parsed.success) {
        console.log("Error in validation:", parsed.error);
        const firstError = parsed.error.issues[0]?.message || "Error in validations";
        throw new ApiError(400, `Error in validations: ${firstError}`);
    }

    const createRejected = new serviceAcceptanceModal(parsed.data);
    await createRejected.save();
    return res.status(201).json(new ApiResponse(201, "Rejected the request", createRejected));
});
