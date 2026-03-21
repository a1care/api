import mongoose from "mongoose";
import serviceRequestModel from "./serviceRequest.model.js";
import { ChildServiceModel } from "../../Services/childService.model.js";
import DoctorModel from "../../Doctors/doctor.model.js";
import Location from "../location.model.js";
import { calculateDistance } from "../../../utils/geo.js";
import { enqueuePushToMany } from "../../../queues/communicationQueue.js";

export const BROADCAST_DELAY_MS = 10_000;

export async function runBroadcastToAll(serviceRequestId: string): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId).populate("childServiceId");
  if (!request || request.status !== "PENDING") return;

  const userLat = request.location?.lat;
  const userLng = request.location?.lng;

  const childSvc = await ChildServiceModel.findById(request.childServiceId);
  if (!childSvc?.allowedRoleIds?.length) {
    await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
      status: "BROADCASTED",
      broadcastedAt: new Date(),
    });
    return;
  }

  // 1. Get all active partners with matching roles
  const activePartners = await DoctorModel.find({
    roleId: { $in: childSvc.allowedRoleIds },
    status: "Active",
    fcmToken: { $exists: true, $ne: null },
  }).select("_id fcmToken serviceRadius");

  // 2. Filter partners by Radius
  const partnersInRadius: any[] = [];
  
  if (userLat && userLng) {
    for (const partner of activePartners) {
        const partnerLoc = await Location.findOne({ userId: partner._id });
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

  const serviceName = (request.childServiceId as any)?.name ?? "a service";
  await enqueuePushToMany(
    partnersInRadius.map((p) => ({
      recipientId: p._id as mongoose.Types.ObjectId,
      recipientType: "partner" as const,
      fcmToken: p.fcmToken ?? null,
    })),
    "🆕 New Job Available!",
    `A new ${serviceName} booking near you — tap to accept.`,
    { screen: "bookings", bookingId: String(serviceRequestId) },
    "ServiceRequest",
    request._id as mongoose.Types.ObjectId
  );

  await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
    status: "BROADCASTED",
    broadcastedAt: new Date(),
  });
}
