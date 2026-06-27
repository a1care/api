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

export const BROADCAST_DELAY_MS = 10_000;

export async function runBroadcastToAll(serviceRequestId: string): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId)
    .populate("childServiceId")
    .populate("healthPackageId");
  if (!request || request.status !== "PENDING") return;

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

  // 1. Get all active partners with matching roles + Active Subscription
  const activeSubs = await (await import("../../PartnerSubscription/subscription.model.js")).default.find({
    status: "Active",
    endDate: { $gte: new Date() }
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
    fcmToken: { $exists: true, $ne: null },
  }).select("_id fcmToken serviceRadius");

  // 2. Filter partners by Radius
  const partnersInRadius: any[] = [];
  
  // Exclude partners whose stored location is stale (app killed/offline) so dead
  // partners don't fill the broadcast list with out-of-date coordinates.
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

  if (userLat && userLng) {
    for (const partner of activePartners) {
        const partnerLoc = await Location.findOne({ userId: partner._id, updatedAt: { $gte: staleThreshold } });
        if (partnerLoc && partnerLoc.latitude && partnerLoc.longitude) {
            const distance = calculateDistance(userLat, userLng, partnerLoc.latitude, partnerLoc.longitude);
            const radius = partner.serviceRadius || 0;
            
            console.log(`[GEO] Partner ${partner._id} is ${distance.toFixed(2)}km away. Allowed: ${radius}km`);
            
            if (distance <= radius || radius === 0) { // radius=0 could mean "No Limit" or "Not Set"
                partnersInRadius.push(partner);
            }
        }
    }
  } else {
    // If user's location isn't provided (unlikely), broadcast to all matching active roles
    partnersInRadius.push(...activePartners);
  }

  if (partnersInRadius.length === 0) {
    console.log(`[BROADCAST] No partners found within radius for request ${serviceRequestId}`);
  }

  const serviceName = (request.childServiceId as any)?.name ?? (request.healthPackageId as any)?.name ?? "a service";
  await enqueuePushToMany(
    partnersInRadius.map((p) => ({
      recipientId: p._id as mongoose.Types.ObjectId,
      recipientType: "partner" as const,
      fcmToken: p.fcmToken ?? null,
    })),
    "🆕 New Job Available!",
    `A new ${serviceName} booking near you — tap to accept.`,
    { screen: `/booking/${serviceRequestId}` },
    "ServiceRequest",
    request._id as mongoose.Types.ObjectId
  );

  await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
    status: "BROADCASTED",
    broadcastedAt: new Date(),
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
    `A broadcasted booking received no response from partners in 30 minutes. Please assign manually.`,
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
