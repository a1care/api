import { Queue } from "bullmq";
import { getQueueRedisConnection } from "./redisConnection.js";
import { runBroadcastToAll, BROADCAST_DELAY_MS } from "../modules/Bookings/service/serviceBroadcast.js";

const connection = getQueueRedisConnection();
const bookingQueue =
  connection && process.env.ENABLE_QUEUE === "true"
    ? new Queue("a1care-bookings", { connection })
    : null;

/**
 * Schedule broadcast to all service members 10s after creation.
 * When queue is disabled, runs in-process after 10s.
 */
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

export { bookingQueue };
