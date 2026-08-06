import mongoose from "mongoose";
import serviceRequestModel from "./serviceRequest.model.js";
import { ChildServiceModel } from "../../Services/childService.model.js";
import { HealthPackageModel } from "../../HealthPackages/healthPackage.model.js";
import DoctorModel from "../../Doctors/doctor.model.js";
import Location from "../location.model.js";
import { calculateDistance } from "../../../utils/geo.js";
import { enqueuePush, enqueuePushToMany } from "../../../queues/communicationQueue.js";
import { Patient } from "../../Authentication/patient.model.js";
import { notifyAdmin } from "../../Notifications/notification.controller.js";
import { emitToRoom } from "../../../socket.js";

export const BROADCAST_DELAY_MS = 10_000;

export async function runBroadcastToAll(serviceRequestId: string): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId)
    .populate("childServiceId")
    .populate("healthPackageId");
  if (!request || request.status !== "PENDING") return;

  // Do not broadcast HOSPITAL_VISIT (OP bookings) to freelance partners
  if (request.fulfillmentMode === "HOSPITAL_VISIT") {
      await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
          status: "ACCEPTED",
          broadcastedAt: new Date(),
          notes: (request.notes ? request.notes + " " : "") + "[Auto-Accepted for Hospital OP Queue]"
      });
      return;
  }

  const userLat = request.location?.lat;
  const userLng = request.location?.lng;

  let allowedRoleIds: mongoose.Types.ObjectId[] = [];
  if (request.childServiceId) {
    const childSvc = await ChildServiceModel.findById(request.childServiceId);
    allowedRoleIds = (childSvc?.allowedRoleIds || []) as any;
  } else if (request.healthPackageId) {
    const healthPkg = await HealthPackageModel.findById(request.healthPackageId);
    allowedRoleIds = (healthPkg?.allowedRoleIds || []) as any;
  }

  if (allowedRoleIds.length === 0) {
    await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
      status: "BROADCASTED",
      broadcastedAt: new Date(),
    });
    return;
  }

  // 1. Get all active partners with matching roles + Active/Grace Period Subscription
  const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
  const graceThreshold = new Date(Date.now() - gracePeriodMs);

  const activeSubs = await (await import("../../PartnerSubscription/subscription.model.js")).default.find({
    status: { $in: ["Active", "Expired"] },
    endDate: { $gte: graceThreshold }
  }).select("partnerId");
  const subscribedPartnerIds = activeSubs.map(s => s.partnerId);

  // Cast string IDs → ObjectId so $in matches doctor.roleId (ObjectId field)
  const allowedRoleObjectIds = allowedRoleIds
    .filter(id => mongoose.Types.ObjectId.isValid(id.toString()))
    .map(id => new mongoose.Types.ObjectId(id.toString()));

  const activePartners = await DoctorModel.find({
    _id: { $in: subscribedPartnerIds },
    roleId: { $in: allowedRoleObjectIds },
    status: "Active",
  }).select("_id fcmToken serviceRadius");

  // 2. Filter partners by Radius
  const partnersInRadius: any[] = [];
  
  // Exclude partners whose stored location is stale (app killed/offline)
  const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours

  if (userLat && userLng) {
    for (const partner of activePartners) {
        const partnerLoc = await Location.findOne({ userId: partner._id });
        if (partnerLoc && partnerLoc.latitude && partnerLoc.longitude) {
            const distance = calculateDistance(userLat, userLng, partnerLoc.latitude, partnerLoc.longitude);
            const radius = partner.serviceRadius && partner.serviceRadius > 0 ? partner.serviceRadius : 50; // Default 50km
            
            console.log(`[GEO] Partner ${partner._id} is ${distance.toFixed(2)}km away. Allowed: ${radius}km`);
            
            if (distance <= radius) {
                partnersInRadius.push(partner);
            }
        } else {
            // Partner has no location stored — include them anyway (they may be new)
            console.log(`[GEO] Partner ${partner._id} has no location — including in broadcast`);
            partnersInRadius.push(partner);
        }
    }
  } else {
    // If user's location isn't provided, broadcast to all matching active roles
    partnersInRadius.push(...activePartners);
  }

  const serviceName = (request.childServiceId as any)?.name ?? (request.healthPackageId as any)?.name ?? "a service";
  console.info(`[BOOKING] [BROADCAST_START] [${serviceRequestId}] Broadcasting ${serviceName} to active partners with roles: ${allowedRoleIds}`);

  if (partnersInRadius.length === 0) {
    console.warn(`[BOOKING] [BROADCAST_FAIL] [${serviceRequestId}] No partners found within radius or with active subscriptions.`);
  } else {
    console.info(`[BOOKING] [BROADCAST_SENT] [${serviceRequestId}] Found ${partnersInRadius.length} eligible partners in radius. Broadcasting push notifications.`);
  }
  await enqueuePushToMany(
    partnersInRadius.map((p) => ({
      recipientId: p._id as mongoose.Types.ObjectId,
      recipientType: "partner" as const,
      fcmToken: p.fcmToken ?? null,
    })),
    "🆕 New Booking Available!",
    `A new ${serviceName} booking near you — tap to accept.`,
    { screen: `/booking/${serviceRequestId}` },
    "ServiceRequest",
    request._id as mongoose.Types.ObjectId
  );

  await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
    status: "BROADCASTED",
    broadcastedAt: new Date(),
  });

  // Fetch patient name for the WebSocket payload
  let patientName = "Customer";
  try {
      const patient = await Patient.findById(request.userId).select("name");
      if (patient?.name) patientName = patient.name;
  } catch (e) {
      console.error("[Booking] Error fetching patient name for broadcast:", e);
  }

  // Construct the ultra-fast WebSocket payload
  const wsPayload = {
      bookingId: serviceRequestId,
      serviceName,
      patientName,
      location: request.location ? "Near You" : "Remote", // Ideally format address here if available
      amount: (request as any).price || 0,
      scheduledTime: request.bookingType === "SCHEDULED" ? request.scheduledSlot?.startTime?.toISOString() : undefined,
      acceptanceDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  };

  // Blast the payload directly to all eligible partners via WebSockets
  partnersInRadius.forEach((p) => {
      emitToRoom(`user_${p._id.toString()}`, "booking:assignment_request", wsPayload);
  });

  // Notify customer that we're actively looking for a partner
  try {
    const req = await serviceRequestModel.findById(serviceRequestId);
    if (req) {
      const patient = await Patient.findById(req.userId).select("fcmToken");
      if (patient?.fcmToken) {
        await enqueuePush({
          recipientId: patient._id as mongoose.Types.ObjectId,
          recipientType: "patient",
          fcmToken: patient.fcmToken,
          title: "🔍 Finding Your Partner",
          body: "Your booking is live! We're notifying nearby partners. You'll hear back soon.",
          data: { screen: `/booking/${serviceRequestId}` },
          refType: "ServiceRequest",
          refId: req._id as mongoose.Types.ObjectId,
        });
      }
    }
  } catch (e) {
    console.error("[Push] broadcast customer notify error:", e);
  }

  // Schedule a 30-min timeout — if no partner claims it, return to admin
  try {
    const { scheduleBroadcastTimeout } = await import("../../../queues/bookingQueue.js");
    await scheduleBroadcastTimeout(serviceRequestId);
  } catch (e) {
    console.error("[Booking] broadcast timeout schedule error:", e);
  }
}

export async function runBroadcastTimeout(serviceRequestId: string): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId);
  if (!request || request.status !== "BROADCASTED") return; // Already claimed or cancelled

  await serviceRequestModel.findByIdAndUpdate(serviceRequestId, { status: "RETURNED_TO_ADMIN" });

  await notifyAdmin(
    "⏰ Booking Expired — No Partner Accepted",
    `A broadcasted booking received no response from partners in 1 minute. Please assign manually.`,
    "ServiceRequest",
    serviceRequestId
  );

  try {
    const patient = await Patient.findById(request.userId).select("fcmToken");
    if (patient?.fcmToken) {
      await enqueuePush({
        recipientId: patient._id as mongoose.Types.ObjectId,
        recipientType: "patient",
        fcmToken: patient.fcmToken,
        title: "🔄 Still Working on It",
        body: "We're still finding the right partner for you. Our team will assign one shortly — hang tight!",
        data: { screen: `/booking/${serviceRequestId}` },
        refType: "ServiceRequest",
        refId: request._id as mongoose.Types.ObjectId,
      });
    }
  } catch (e) {
    console.error("[Push] broadcast timeout customer notify error:", e);
  }
}

export async function runServiceReminder(serviceRequestId: string, type: '24h' | '2h'): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId).populate("assignedProviderId");
  
  if (!request || !request.assignedProviderId) return;
  // If the booking is not ACCEPTED (e.g. they cancelled it later), don't send reminder
  if (request.status !== "ACCEPTED" && request.status !== "PARTNER_ASSIGNED") return;

  const partnerId = (request.assignedProviderId as any)._id || request.assignedProviderId;
  const partner = await DoctorModel.findById(partnerId).select("fcmToken");
  
  if (!partner?.fcmToken) return;

  const title = type === '24h' ? "📅 Upcoming Service Reminder" : "⏳ Starting Soon";
  const body = type === '24h' 
    ? "You have a scheduled booking tomorrow. Please make sure you are prepared."
    : "Your service appointment starts in 2 hours. Please prepare to depart soon.";

  try {
    await enqueuePush({
      recipientId: partner._id as mongoose.Types.ObjectId,
      recipientType: "partner",
      fcmToken: partner.fcmToken,
      title,
      body,
      data: { screen: `/booking_detail/${serviceRequestId}` },
      refType: "ServiceRequest",
      refId: request._id as mongoose.Types.ObjectId,
    });
  } catch (e) {
    console.error(`[Push] Service reminder ${type} error:`, e);
  }
}
