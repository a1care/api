import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import DoctorAppointment from "./doctorAppointment.model.js";
import ServiceRequest from "./service/serviceRequest.model.js";
import Doctor from "../Doctors/doctor.model.js";
import PartnerLocation from "./location.model.js";
import { calculateDistance } from "../../utils/geo.js";
import { getActiveCommissionRate } from "../PartnerSubscription/subscription.controller.js";
import serviceAcceptanceModal from "./service/serviceAcceptance.model.js";

const formatTimeSlot = (startTime?: Date | string, endTime?: Date | string) => {
    if (!startTime) return "As scheduled";
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    
    const formatTime = (d: Date) => {
        let hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minStr} ${ampm}`;
    };

    if (end) {
        return `${formatTime(start)} - ${formatTime(end)}`;
    }
    return formatTime(start);
};

/**
 * Merges Doctor Appointments and Service Requests into a single feed for the Partner.
 */
const formatFeedAddress = (addrObj: any, fallbackLoc?: any) => {
    if (!addrObj && !fallbackLoc?.address) return "Patient Location";
    if (addrObj) {
        const full = addrObj.address || [addrObj.houseNo, addrObj.addressLine1, addrObj.street, addrObj.landmark, addrObj.city, addrObj.state, addrObj.pincode].filter(Boolean).join(", ");
        if (full) return full;
    }
    return fallbackLoc?.address || "Patient Location";
};

export const getProviderUnifiedFeed = asyncHandler(async (req, res) => {
    const providerId = req.user?.id;
    if (!providerId) throw new ApiError(401, "Provider ID missing");

    const [provider, partnerLoc, rejected] = await Promise.all([
        Doctor.findById(providerId),
        PartnerLocation.findOne({ userId: providerId }),
        serviceAcceptanceModal.find({
            providerId,
            status: "REJECTED"
        }).select("serviceRequestId").lean()
    ]);
    if (!provider) throw new ApiError(404, "Provider not found");

    const { status } = req.query;
    const isOnline = partnerLoc ? partnerLoc.isOnline : true;
    const rejectedIds = rejected.map(r => r.serviceRequestId?.toString()).filter(Boolean);

    // Status mapping for DoctorAppointment
    const daStatus = (status === 'Pending') ? ["Pending"] :
                   (status === 'Confirmed') ? ["Confirmed"] :
                   (status === 'Completed') ? ["Completed"] :
                   (status === 'Cancelled') ? ["Cancelled"] :
                   (status === 'Missing') ? [] :
                   (status === 'all') ? ["Pending", "Confirmed", "Completed", "Cancelled"] :
                   ["Pending", "Confirmed"];

    // Status mapping for assigned ServiceRequests
    let srStatus = (status === 'Pending') ? ["ACCEPTED", "PARTNER_ASSIGNED"] :
                    (status === 'Confirmed') ? ["ACCEPTED", "IN_PROGRESS"] :
                    (status === 'Completed') ? ["COMPLETED"] :
                    (status === 'Cancelled') ? ["CANCELLED"] :
                    (status === 'Missing') ? [] :
                    (status === 'all') ? ["ACCEPTED", "IN_PROGRESS", "PARTNER_ASSIGNED", "COMPLETED", "CANCELLED"] :
                    ["ACCEPTED", "IN_PROGRESS", "PARTNER_ASSIGNED"];

    // We no longer filter out PARTNER_ASSIGNED when offline, because if an admin manually
    // assigned a booking, the partner needs to see it and respond.
    // if (!isOnline) {
    //     srStatus = srStatus.filter(s => s !== "PARTNER_ASSIGNED");
    // }

    const commissionPct = await getActiveCommissionRate(providerId);
    const earningRatio = (100 - commissionPct) / 100;

    // Fetch all booking sources concurrently!
    const [appointments, assignedServices, broadcastedServices, rejectedServices] = await Promise.all([
        DoctorAppointment.find({
            doctorId: providerId,
            status: { $in: daStatus }
        }).populate("patientId", "name mobileNumber profileImage"),

        ServiceRequest.find({
            assignedProviderId: providerId,
            status: { $in: srStatus }
        }).populate("userId", "name mobileNumber profileImage").populate("childServiceId").populate("addressId"),

        // Always fetch broadcasted bookings regardless of online status
        // so the FloatingBookingAlert always works in APK
        (async () => {
            const partnerRoleId = provider.roleId;

            let timeQuery: any = {};
            if (status === 'Missing') {
                if (partnerLoc && partnerLoc.lastOfflineAt && partnerLoc.lastOnlineAt) {
                    timeQuery.createdAt = {
                        $gte: partnerLoc.lastOfflineAt,
                        $lte: partnerLoc.lastOnlineAt
                    };
                } else {
                    timeQuery._id = null;
                }
            }

            // Only skip broadcasted bookings when explicitly filtering for non-pending statuses
            const skipBroadcast = (status === 'Completed' || status === 'Cancelled');
            if (skipBroadcast) return [];

            let services = await ServiceRequest.find({
                _id: { $nin: rejectedIds },
                status: "BROADCASTED",
                ...timeQuery
            })
                .populate("userId", "name mobileNumber profileImage")
                .populate("childServiceId")
                .populate("addressId")
                .lean();

            if (partnerRoleId) {
                services = services.filter((s) => {
                    const allowed = (s.childServiceId as any)?.allowedRoleIds;
                    if (!allowed || allowed.length === 0)
                        return true;
                    return allowed.some((r: any) => r.toString() === partnerRoleId.toString());
                });
            }

            if (partnerLoc && partnerLoc.latitude && partnerLoc.longitude) {
                const radius = provider.serviceRadius && provider.serviceRadius > 0 ? provider.serviceRadius : 50;
                services = services.filter((s: any) => {
                    const addr = s.addressId;
                    const bookingLat = addr?.location?.lat ?? s.location?.lat;
                    const bookingLng = addr?.location?.lng ?? s.location?.lng;
                    if (!bookingLat || !bookingLng)
                        return true;
                    const distance = calculateDistance(bookingLat, bookingLng, partnerLoc.latitude, partnerLoc.longitude);
                    return distance <= radius;
                });
            }
            return services;
        })(),

        (status === 'Cancelled' || status === 'all' || !status) ? ServiceRequest.find({
            _id: { $in: rejectedIds }
        }).populate("userId", "name mobileNumber profileImage").populate("childServiceId").populate("addressId").lean() : Promise.resolve([])
    ]);

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
            partnerEarning: (a as any).partnerEarning || ((a as any).totalAmount * earningRatio),
            paymentMode: (a as any).paymentMode || "ONLINE",
            paymentStatus: (a as any).paymentStatus || "PENDING",
            location: { address: "At Hospital / Online" },
            createdAt: (a as any).createdAt
        })),
        ...assignedServices.map(s => ({
            _id: s._id,
            bookingType: "Service",
            patientName: (s.userId as any)?.name,
            serviceType: (s.childServiceId as any)?.name || "Service",
            status: s.status,
            date: (s as any).scheduledSlot?.startTime || (s as any).createdAt,
            timeSlot: (s as any).scheduledSlot?.startTime ? formatTimeSlot((s as any).scheduledSlot.startTime, (s as any).scheduledSlot.endTime) : "As scheduled",
            totalAmount: s.price,
            partnerEarning: (s as any).partnerEarning || (s.price * earningRatio),
            paymentMode: (s as any).paymentMode || "ONLINE",
            paymentStatus: (s as any).paymentStatus || "PENDING",
            location: { address: formatFeedAddress(s.addressId, (s as any).location) },
            createdAt: (s as any).createdAt,
            acceptanceDeadline: (s as any).acceptanceDeadline
        })),
        ...broadcastedServices.map((s: any) => {
            let finalStatus = s.status;
            if (partnerLoc && partnerLoc.lastOfflineAt && partnerLoc.lastOnlineAt) {
                const created = new Date(s.createdAt);
                if (created >= new Date(partnerLoc.lastOfflineAt) && created <= new Date(partnerLoc.lastOnlineAt)) {
                    finalStatus = "Missing";
                }
            }
            return {
                _id: s._id,
                bookingType: "Service",
                patientName: s.userId?.name || "Patient",
                serviceType: s.childServiceId?.name || "Service",
                status: finalStatus,
                date: s.scheduledSlot?.startTime || s.createdAt,
                timeSlot: s.scheduledSlot?.startTime ? formatTimeSlot(s.scheduledSlot.startTime, s.scheduledSlot.endTime) : "As scheduled",
                totalAmount: s.price,
                partnerEarning: s.partnerEarning || (s.price * earningRatio),
                paymentMode: s.paymentMode || "ONLINE",
                paymentStatus: s.paymentStatus || "PENDING",
                location: { address: formatFeedAddress(s.addressId, s.location) },
                createdAt: s.createdAt,
                acceptanceDeadline: s.acceptanceDeadline
            };
        }),
        ...rejectedServices.map((s: any) => ({
            _id: s._id,
            bookingType: "Service",
            patientName: s.userId?.name || "Patient",
            serviceType: s.childServiceId?.name || "Service",
            status: "CANCELLED",
            date: s.scheduledSlot?.startTime || s.createdAt,
            timeSlot: s.scheduledSlot?.startTime ? formatTimeSlot(s.scheduledSlot.startTime, s.scheduledSlot.endTime) : "As scheduled",
            totalAmount: s.price,
            partnerEarning: s.partnerEarning || (s.price * earningRatio),
            paymentMode: s.paymentMode || "ONLINE",
            paymentStatus: s.paymentStatus || "PENDING",
            location: { address: formatFeedAddress(s.addressId, s.location) },
            createdAt: s.createdAt
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
            partnerEarning: appt.partnerEarning || (appt.totalAmount * ((100 - (await getActiveCommissionRate(providerId))) / 100)),
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

    const provider = await Doctor.findById(providerId);
    if (!provider) throw new ApiError(404, "Provider not found");

    if (svc.status !== "BROADCASTED" && String(svc.assignedProviderId ?? "") !== String(providerId)) {
        // If they rejected it, they should still be able to view its details (it shows up as CANCELLED in their feed)
        const hasRejected = await serviceAcceptanceModal.findOne({
            serviceRequestId: id,
            providerId,
            status: "REJECTED"
        });
        
        if (!hasRejected) {
            throw new ApiError(403, "This booking is not assigned to you");
        }
    }

    if (svc.status === "BROADCASTED") {
        const allowed = (svc.childServiceId as any)?.allowedRoleIds;
        const partnerRoleId = provider.roleId;
        if (allowed && allowed.length > 0 && partnerRoleId) {
            const hasRole = allowed.some((r: any) => r.toString() === partnerRoleId.toString());
            if (!hasRole) {
                throw new ApiError(403, "Your role is not authorized to view this booking");
            }
        }
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
        partnerEarning: svc.partnerEarning || (svc.price * ((100 - (await getActiveCommissionRate(providerId))) / 100)),
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
