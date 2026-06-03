import dotenv from "dotenv";
dotenv.config();
import { Job, Worker } from "bullmq";
import { getQueueRedisConnection } from "../queues/redisConnection.js";
import { sendPush, sendPushToMany } from "../utils/sendPushNotification.js";
import {
  sendAppointmentConfirmationEmail,
  sendWalletTopupEmail,
  sendWelcomeEmail,
  sendPartnerWelcomeEmail,
  sendPartnerApprovalEmail,
  sendPartnerRejectionEmail,
  sendRefundConfirmationEmail,
  sendServiceCompletedEmail,
  sendPayoutStatusEmail,
} from "../utils/email.js";
import sendAlotsSms from "../utils/alotsSms.js";

const connection = getQueueRedisConnection();

if (!connection || process.env.ENABLE_QUEUE !== "true") {
  console.log("[Worker] Queue disabled (set ENABLE_QUEUE=true to enable).");
  process.exit(0);
}

new Worker(
  "a1care-communications",
  async (job: Job) => {
    if (job.name === "push") {
      await sendPush(job.data);
      return;
    }
    if (job.name === "push_many") {
      const { targets, title, body, data, refType, refId } = job.data;
      await sendPushToMany(targets, title, body, data ?? {}, refType, refId);
      return;
    }
    if (job.name === "email") {
      const payload = job.data as any;
      if (payload.kind === "welcome") await sendWelcomeEmail(payload.data);
      if (payload.kind === "partner_welcome") await sendPartnerWelcomeEmail(payload.data);
      if (payload.kind === "partner_approved") await sendPartnerApprovalEmail(payload.data);
      if (payload.kind === "partner_rejected") await sendPartnerRejectionEmail(payload.data);
      if (payload.kind === "appointment") await sendAppointmentConfirmationEmail(payload.data);
      if (payload.kind === "wallet_topup") await sendWalletTopupEmail(payload.data);
      if (payload.kind === "refund") await sendRefundConfirmationEmail(payload.data.email, payload.data.fullName, payload.data.amount, payload.data.serviceName, payload.data.bookingId);
      if (payload.kind === "service_completed") await sendServiceCompletedEmail(payload.data.email, payload.data.fullName, payload.data.serviceName, payload.data.partnerName, payload.data.amount, payload.data.date);
      if (payload.kind === "payout_update") await sendPayoutStatusEmail(payload.data.email, payload.data.fullName, payload.data.amount, payload.data.status, payload.data.adminNote);
      return;
    }
    if (job.name === "sms") {
      const { mobileNumber, otp } = job.data;
      await sendAlotsSms(mobileNumber, otp);
      return;
    }
  },
  { connection, concurrency: 10 }
);

console.log("[Worker] communication worker started.");
