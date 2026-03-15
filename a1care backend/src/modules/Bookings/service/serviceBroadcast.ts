import mongoose from "mongoose";
import serviceRequestModel from "./serviceRequest.model.js";
import { ChildServiceModel } from "../../Services/childService.model.js";
import DoctorModel from "../../Doctors/doctor.model.js";
import { enqueuePushToMany } from "../../../queues/communicationQueue.js";

export const BROADCAST_DELAY_MS = 10_000;

/**
 * If the service request is still PENDING, broadcast to all allowed partners and set BROADCASTED.
 * Used by the booking worker (after 10s delay) and by fallback when queue is disabled.
 */
export async function runBroadcastToAll(serviceRequestId: string): Promise<void> {
  const request = await serviceRequestModel.findById(serviceRequestId).populate("childServiceId");
  if (!request || request.status !== "PENDING") return;

  const childSvc = await ChildServiceModel.findById(request.childServiceId);
  if (!childSvc?.allowedRoleIds?.length) {
    await serviceRequestModel.findByIdAndUpdate(serviceRequestId, {
      status: "BROADCASTED",
      broadcastedAt: new Date(),
    });
    return;
  }

  const matchingPartners = await DoctorModel.find({
    roleId: { $in: childSvc.allowedRoleIds },
    status: "Active",
    fcmToken: { $exists: true, $ne: null },
  }).select("_id fcmToken");

  const serviceName = (request.childServiceId as any)?.name ?? "a service";
  await enqueuePushToMany(
    matchingPartners.map((p) => ({
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
