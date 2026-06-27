import { Worker } from "bullmq";
import { getQueueRedisConnection } from "../queues/redisConnection.js";
import { runBroadcastToAll } from "../modules/Bookings/service/serviceBroadcast.js";

const connection = getQueueRedisConnection();

if (!connection || process.env.ENABLE_QUEUE !== "true") {
  console.log("[Booking Worker] Queue disabled (set ENABLE_QUEUE=true to enable).");
  process.exit(0);
}

new Worker(
  "a1care-bookings",
  async (job) => {
    if (job.name === "broadcast_service_to_all") {
      const { serviceRequestId } = job.data as { serviceRequestId: string };
      if (serviceRequestId) await runBroadcastToAll(serviceRequestId);
      return;
    }
    if (job.name === "broadcast_timeout") {
      const { serviceRequestId } = job.data as { serviceRequestId: string };
      if (serviceRequestId) {
        const { runBroadcastTimeout } = await import("../modules/Bookings/service/serviceBroadcast.js");
        await runBroadcastTimeout(serviceRequestId);
      }
      return;
    }
    if (job.name === "appointment_reminder") {
      const { appointmentId } = job.data as { appointmentId: string };
      if (appointmentId) {
        const { runAppointmentReminder } = await import("../modules/Bookings/doctorAppointment.controller.js");
        await runAppointmentReminder(appointmentId);
      }
      return;
    }
  },
  { connection }
);

console.log("[Booking Worker] started.");
