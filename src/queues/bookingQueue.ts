import { Queue } from "bullmq";
import { getQueueRedisConnection } from "./redisConnection.js";
import { runBroadcastToAll, BROADCAST_DELAY_MS } from "../modules/Bookings/service/serviceBroadcast.js";

const connection = getQueueRedisConnection();
const bookingQueue =
  connection && process.env.ENABLE_QUEUE === "true"
    ? new Queue("a1care-bookings", { connection })
    : null;

const BROADCAST_TIMEOUT_MS = 30 * 60 * 1000; // 30 min: auto-return to admin if no partner claims
const PARTNER_ACCEPTANCE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min: auto-unassign if partner doesn't accept

export async function scheduleBroadcastToAll(serviceRequestId: string) {
  if (bookingQueue) {
    await bookingQueue.add(
      "broadcast_service_to_all",
      { serviceRequestId },
      { delay: BROADCAST_DELAY_MS, removeOnComplete: true, attempts: 3 }
    );
    return;
  }
  setTimeout(() => {
    runBroadcastToAll(serviceRequestId).catch((e) =>
      console.error("[Booking] broadcast_service_to_all fallback error:", e)
    );
  }, BROADCAST_DELAY_MS);
}

export async function scheduleBroadcastTimeout(serviceRequestId: string) {
  if (bookingQueue) {
    await bookingQueue.add(
      "broadcast_timeout",
      { serviceRequestId },
      { delay: BROADCAST_TIMEOUT_MS, removeOnComplete: true, attempts: 2 }
    );
    return;
  }
  setTimeout(async () => {
    const { runBroadcastTimeout } = await import("../modules/Bookings/service/serviceBroadcast.js");
    runBroadcastTimeout(serviceRequestId).catch((e) =>
      console.error("[Booking] broadcast_timeout fallback error:", e)
    );
  }, BROADCAST_TIMEOUT_MS);
}

export async function schedulePartnerAcceptanceTimeout(serviceRequestId: string, partnerId: string) {
  const handler = async () => {
    const { runPartnerAcceptanceTimeout } = await import("../modules/Bookings/service/serviceRequest.controller.js");
    runPartnerAcceptanceTimeout(serviceRequestId, partnerId).catch((e) =>
      console.error("[Booking] partner_acceptance_timeout error:", e)
    );
  };
  if (bookingQueue) {
    await bookingQueue.add(
      "partner_acceptance_timeout",
      { serviceRequestId, partnerId },
      { jobId: `accept_timeout:${serviceRequestId}`, delay: PARTNER_ACCEPTANCE_TIMEOUT_MS, removeOnComplete: true, attempts: 2 }
    );
    return;
  }
  setTimeout(handler, PARTNER_ACCEPTANCE_TIMEOUT_MS);
}

export async function cancelPartnerAcceptanceTimeout(serviceRequestId: string) {
  if (!bookingQueue) return;
  const job = await bookingQueue.getJob(`accept_timeout:${serviceRequestId}`);
  if (job) await job.remove();
}

export async function scheduleAppointmentReminder(appointmentId: string, appointmentTimestamp: number) {
  const delayMs = appointmentTimestamp - Date.now() - 24 * 60 * 60 * 1000;
  if (delayMs <= 0) return; // Within 24h — skip
  if (bookingQueue) {
    await bookingQueue.add(
      "appointment_reminder",
      { appointmentId },
      { jobId: `reminder:${appointmentId}`, delay: delayMs, removeOnComplete: true, attempts: 2 }
    );
    return;
  }
  setTimeout(async () => {
    const { runAppointmentReminder } = await import("../modules/Bookings/doctorAppointment.controller.js");
    runAppointmentReminder(appointmentId).catch((e) =>
      console.error("[Booking] appointment_reminder fallback error:", e)
    );
  }, delayMs);
}

export async function cancelAppointmentReminder(appointmentId: string) {
  if (!bookingQueue) return;
  const job = await bookingQueue.getJob(`reminder:${appointmentId}`);
  if (job) await job.remove();
}

export { bookingQueue };
