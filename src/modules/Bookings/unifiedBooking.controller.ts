import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import DoctorAppointment from "./doctorAppointment.model.js";
import ServiceRequest from "./service/serviceRequest.model.js";
import Doctor from "../Doctors/doctor.model.js";

/**
 * Merges Doctor Appointments and Service Requests into a single feed for the Partner.
 */
export const getProviderUnifiedFeed = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    if (!providerId) throw new ApiError(401, "Provider ID missing");

    const provider = await Doctor.findById(providerId);
    if (!provider) throw new ApiError(404, "Provider not found");

    const { status } = req.query; // status mapping needed
    
    // Status mapping for DoctorAppointment
    const daStatus = (status === 'Pending') ? ["Pending"] : 
                   (status === 'Confirmed') ? ["Confirmed"] :
                   (status === 'Completed') ? ["Completed"] :
                   (status === 'Cancelled') ? ["Cancelled"] : ["Pending", "Confirmed"];

    // Status mapping for ServiceRequest
    const srStatus = (status === 'Pending') ? ["PENDING", "BROADCASTED"] :
                    (status === 'Confirmed') ? ["ACCEPTED", "IN_PROGRESS"] :
                    (status === 'Completed') ? ["COMPLETED"] :
                    (status === 'Cancelled') ? ["CANCELLED"] : ["BROADCASTED", "ACCEPTED"];

    // 1. Fetch Doctor Appointments
    const appointments = await DoctorAppointment.find({
        doctorId: providerId,
        status: { $in: daStatus }
    }).populate("patientId", "name mobileNumber profileImage");

    // 2. Fetch Assigned Service Requests
    const assignedServices = await ServiceRequest.find({
        assignedProviderId: providerId,
        status: { $in: srStatus }
    }).populate("userId", "name mobileNumber profileImage").populate("childServiceId");

    // 3. Fetch Broadcasted Service Requests (only for 'Pending' tab and role-compatible)
    let broadcastedServices: any[] = [];
    if (status === 'Pending' || !status) {
        broadcastedServices = await ServiceRequest.find({
            status: "BROADCASTED",
            $or: [
                { assignedProviderId: { $exists: false } },
                { assignedProviderId: null },
                { assignedProviderId: providerId }, // safety: if already pre-assigned to this provider
            ],
        }).populate("userId", "name mobileNumber profileImage").populate("childServiceId");

        // Filter where provider.roleId is allowed.
        // If no allowedRoleIds configured, keep visible (backward-compatible for legacy records).
        broadcastedServices = broadcastedServices.filter(s => {
            const allowed = (s.childServiceId as any)?.allowedRoleIds || [];
            if (!Array.isArray(allowed) || allowed.length === 0) return true;
            const providerRoleId = (provider as any)?.roleId?.toString?.() || "";
            if (!providerRoleId) return true; // Backward compatibility for partners without a role assigned
            return allowed.some((id: any) => {
                const raw = (id as any)?._id ? (id as any)._id : id;
                return raw?.toString?.() === providerRoleId;
            });
        });
    }

    // Transform all to a common format
    const feed = [
        ...appointments.map(a => ({
            _id: a._id,
            bookingType: "Doctor",
            patientName: (a.patientId as any)?.name,
            serviceType: "Doctor Consultation",
            status: a.status,
            date: a.date,
            timeSlot: `${a.startingTime} - ${a.endingTime}`,
            totalAmount: a.totalAmount,
            location: { address: "At Hospital / Online" }
        })),
        ...assignedServices.map(s => ({
            _id: s._id,
            bookingType: "Service",
            patientName: (s.userId as any)?.name,
            serviceType: (s.childServiceId as any)?.name || "Service",
            status: s.status,
            date: new Date(), // Service requests usually don't have a fixed date in model yet?
            timeSlot: "As scheduled",
            totalAmount: s.price,
            location: { address: "Patient Home / Location" }
        })),
        ...broadcastedServices.map(s => ({
            _id: s._id,
            bookingType: "Service",
            patientName: (s.userId as any)?.name,
            serviceType: (s.childServiceId as any)?.name || "Service",
            status: "Broadcasted",
            date: new Date(),
            timeSlot: "New Request",
            totalAmount: s.price,
            location: { address: "In your area" }
        }))
    ];

    return res.json(new ApiResponse(200, "Unified feed fetched", feed));
});
