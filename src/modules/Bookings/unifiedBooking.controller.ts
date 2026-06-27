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

    const { status } = req.query;

    // Status mapping for DoctorAppointment
    const daStatus = (status === 'Pending') ? ["Pending"] :
                   (status === 'Confirmed') ? ["Confirmed"] :
                   (status === 'Completed') ? ["Completed"] :
                   (status === 'Cancelled') ? ["Cancelled"] : ["Pending", "Confirmed"];

    // Status mapping for assigned ServiceRequests
    const srStatus = (status === 'Pending') ? ["ACCEPTED"] :
                    (status === 'Confirmed') ? ["ACCEPTED", "IN_PROGRESS"] :
                    (status === 'Completed') ? ["COMPLETED"] :
                    (status === 'Cancelled') ? ["CANCELLED"] : ["ACCEPTED", "IN_PROGRESS"];

    // 1. Fetch Doctor Appointments
    const appointments = await DoctorAppointment.find({
        doctorId: providerId,
        status: { $in: daStatus }
    }).populate("patientId", "name mobileNumber profileImage");

    // 2. Fetch Assigned Service Requests (direct assignments)
    const assignedServices = await ServiceRequest.find({
        assignedProviderId: providerId,
        status: { $in: srStatus }
    }).populate("userId", "name mobileNumber profileImage").populate("childServiceId");

    // 3. Fetch BROADCASTED bookings (Pending tab only) — open to any eligible partner
    let broadcastedServices: any[] = [];
    if (status === 'Pending') {
        const partnerRoleId = provider.roleId;
        const roleMatchQuery = partnerRoleId
            ? { $or: [{ "childServiceId.allowedRoleIds": partnerRoleId }, { assignedProviderId: { $exists: false } }] }
            : {};
        broadcastedServices = await ServiceRequest.find({
            status: "BROADCASTED",
            ...roleMatchQuery,
        }).populate("userId", "name mobileNumber profileImage")
          .populate("childServiceId")
          .lean();
        // Filter: show only bookings for services that allow this partner's role (or have no role restriction)
        if (partnerRoleId) {
            broadcastedServices = broadcastedServices.filter((s: any) => {
                const allowed = (s.childServiceId as any)?.allowedRoleIds;
                if (!allowed || allowed.length === 0) return true;
                return allowed.some((r: any) => r.toString() === partnerRoleId.toString());
            });
        }
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
            timeSlot: `${(a as any).startingTime} - ${(a as any).endingTime}`,
            totalAmount: (a as any).totalAmount,
            paymentMode: (a as any).paymentMode || "ONLINE",
            paymentStatus: (a as any).paymentStatus || "PENDING",
            location: { address: "At Hospital / Online" }
        })),
        ...assignedServices.map(s => ({
            _id: s._id,
            bookingType: "Service",
            patientName: (s.userId as any)?.name,
            serviceType: (s.childServiceId as any)?.name || "Service",
            status: s.status,
            date: (s as any).scheduledSlot?.startTime || (s as any).createdAt,
            timeSlot: "As scheduled",
            totalAmount: s.price,
            paymentMode: (s as any).paymentMode || "ONLINE",
            paymentStatus: (s as any).paymentStatus || "PENDING",
            location: { address: (s as any).location?.address || "Patient Location" }
        })),
        ...broadcastedServices.map((s: any) => ({
            _id: s._id,
            bookingType: "Service",
            patientName: s.userId?.name || "Patient",
            serviceType: s.childServiceId?.name || "Service",
            status: s.status,
            date: s.scheduledSlot?.startTime || s.createdAt,
            timeSlot: "As scheduled",
            totalAmount: s.price,
            paymentMode: s.paymentMode || "ONLINE",
            paymentStatus: s.paymentStatus || "PENDING",
            location: { address: s.location?.address || "Patient Location" }
        })),
    ];

    return res.json(new ApiResponse(200, "Unified feed fetched", feed));
});

/**
 * GET /appointment/provider/booking/:id?type=Doctor|Service
 * Full detail for a single booking the partner is assigned to (ownership-checked).
 * Returns patient contact, schedule, payment, address and a status timeline.
 */
export const getProviderBookingDetail = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    if (!providerId) throw new ApiError(401, "Provider ID missing");

    const { id } = req.params;
    const type = String(req.query.type || "").trim();

    if (type === "Doctor") {
        const appt: any = await DoctorAppointment.findById(id)
            .populate("patientId", "name mobileNumber profileImage email")
            .populate("doctorId", "name specialization");
        if (!appt) throw new ApiError(404, "Booking not found");
        if (String(appt.doctorId?._id ?? appt.doctorId) !== String(providerId)) {
            throw new ApiError(403, "This booking is not assigned to you");
        }
        return res.json(new ApiResponse(200, "Booking detail", {
            _id: appt._id,
            bookingType: "Doctor",
            status: appt.status,
            patient: {
                name: appt.patientId?.name || "Patient",
                mobile: appt.patientId?.mobileNumber || null,
                profileImage: appt.patientId?.profileImage || null,
            },
            serviceName: "Doctor Consultation",
            date: appt.date,
            timeSlot: `${appt.startingTime} - ${appt.endingTime}`,
            paymentMode: appt.paymentMode || "ONLINE",
            paymentStatus: appt.paymentStatus,
            totalAmount: appt.totalAmount,
            discountAmount: appt.discountAmount || 0,
            couponCode: appt.couponCode || null,
            partnerEarning: appt.partnerEarning ?? null,
            address: { label: "At Hospital / Online Consultation", coords: null },
            notes: null,
            createdAt: appt.createdAt,
            updatedAt: appt.updatedAt,
        }));
    }

    // Default: Service request
    const svc: any = await ServiceRequest.findById(id)
        .populate("userId", "name mobileNumber profileImage email")
        .populate("childServiceId")
        .populate("addressId");
    if (!svc) throw new ApiError(404, "Booking not found");
    if (String(svc.assignedProviderId ?? "") !== String(providerId)) {
        throw new ApiError(403, "This booking is not assigned to you");
    }

    const a = svc.addressId;
    const addr = a
        ? (a.address ||
           [a.houseNo, a.addressLine1, a.street, a.landmark, a.city, a.state, a.pincode]
              .filter(Boolean)
              .join(", "))
        : null;
    // Prefer the saved address's own coords, else the booking's ad-hoc location.
    const addrCoords =
        a?.location?.lat && a?.location?.lng
            ? { lat: a.location.lat, lng: a.location.lng }
            : (svc.location?.lat && svc.location?.lng ? { lat: svc.location.lat, lng: svc.location.lng } : null);

    return res.json(new ApiResponse(200, "Booking detail", {
        _id: svc._id,
        bookingType: "Service",
        status: svc.status,
        patient: {
            name: svc.userId?.name || "Patient",
            mobile: svc.userId?.mobileNumber || null,
            profileImage: svc.userId?.profileImage || null,
        },
        serviceName: svc.childServiceId?.name || "Service",
        date: svc.scheduledSlot?.startTime || svc.createdAt,
        timeSlot: svc.scheduledSlot?.startTime
            ? new Date(svc.scheduledSlot.startTime).toLocaleString()
            : "As scheduled",
        paymentMode: svc.paymentMode || "ONLINE",
        paymentStatus: svc.paymentStatus,
        totalAmount: svc.price,
        discountAmount: svc.discountAmount || 0,
        couponCode: svc.couponCode || null,
        partnerEarning: svc.partnerEarning ?? null,
        address: {
            label: addr || "Patient location",
            coords: addrCoords,
        },
        notes: svc.notes || null,
        fulfillmentMode: svc.fulfillmentMode,
        urgency: svc.urgency || null,
        createdAt: svc.createdAt,
        updatedAt: svc.updatedAt,
    }));
});
