import { Queue } from "bullmq";
import type { PushPayload, MultiPushTarget } from "../utils/sendPushNotification.js";
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
  sendTicketReceiptEmail,
} from "../utils/email.js";
import { getQueueRedisConnection } from "./redisConnection.js";

type EmailJob =
  | { kind: "welcome"; data: Parameters<typeof sendWelcomeEmail>[0] }
  | { kind: "partner_welcome"; data: Parameters<typeof sendPartnerWelcomeEmail>[0] }
  | { kind: "partner_approved"; data: Parameters<typeof sendPartnerApprovalEmail>[0] }
  | { kind: "partner_rejected"; data: Parameters<typeof sendPartnerRejectionEmail>[0] }
  | { kind: "appointment"; data: Parameters<typeof sendAppointmentConfirmationEmail>[0] }
  | { kind: "wallet_topup"; data: Parameters<typeof sendWalletTopupEmail>[0] }
  | { kind: "refund"; data: { email: string; fullName: string; amount: number | string; serviceName: string; bookingId: string } }
  | { kind: "service_completed"; data: { email: string; fullName: string; serviceName: string; partnerName: string; amount: number | string; date: string } }
  | { kind: "payout_update"; data: { email: string; fullName: string; amount: number | string; status: string; adminNote?: string } }
  | { kind: "ticket_receipt"; data: { email: string; fullName: string; subject: string; ticketId: string; priority: string } };

type SmsJob = {
  mobileNumber: string;
  otp: string | number;
};

type PushManyJob = {
  targets: MultiPushTarget[];
  title: string;
  body: string;
  data: Record<string, string>;
  refType?: PushPayload["refType"];
  refId?: PushPayload["refId"];
};

const connection = getQueueRedisConnection();
const queue =
  connection && process.env.ENABLE_QUEUE === "true"
    ? new Queue("a1care-communications", { connection })
    : null;

console.log(`[Queue] Initialized: ${!!queue}, ENABLE_QUEUE: ${process.env.ENABLE_QUEUE}`);

export async function enqueuePush(payload: PushPayload) {
  if (!queue) {
    await sendPush(payload);
    return;
  }
  await queue.add("push", payload, { removeOnComplete: true, attempts: 3 });
}

export async function enqueuePushToMany(
  targets: MultiPushTarget[],
  title: string,
  body: string,
  data: Record<string, string> = {},
  refType?: PushPayload["refType"],
  refId?: PushPayload["refId"]
) {
  const payload: PushManyJob = { targets, title, body, data, refType, refId };
  if (!queue) {
    await sendPushToMany(targets, title, body, data, refType, refId);
    return;
  }
  await queue.add("push_many", payload, { removeOnComplete: true, attempts: 3 });
}

export async function enqueueEmail(payload: EmailJob) {
  if (!queue) {
    if (payload.kind === "welcome") await sendWelcomeEmail(payload.data);
    if (payload.kind === "partner_welcome") await sendPartnerWelcomeEmail(payload.data);
    if (payload.kind === "partner_approved") await sendPartnerApprovalEmail(payload.data);
    if (payload.kind === "partner_rejected") await sendPartnerRejectionEmail(payload.data);
    if (payload.kind === "appointment") await sendAppointmentConfirmationEmail(payload.data);
    if (payload.kind === "wallet_topup") await sendWalletTopupEmail(payload.data);
    if (payload.kind === "refund") await sendRefundConfirmationEmail(payload.data.email, payload.data.fullName, payload.data.amount, payload.data.serviceName, payload.data.bookingId);
    if (payload.kind === "service_completed") await sendServiceCompletedEmail(payload.data.email, payload.data.fullName, payload.data.serviceName, payload.data.partnerName, payload.data.amount, payload.data.date);
    if (payload.kind === "payout_update") await sendPayoutStatusEmail(payload.data.email, payload.data.fullName, payload.data.amount, payload.data.status, payload.data.adminNote);
    if (payload.kind === "ticket_receipt") await sendTicketReceiptEmail(payload.data);
    return;
  }

  await queue.add("email", payload, { removeOnComplete: true, attempts: 3 });
}

export async function enqueueSms(payload: SmsJob) {
  if (!queue) {
    console.log("[Queue] No queue found, sending SMS directly...");
    const sendAlotsSms = (await import("../utils/alotsSms.js")).default;
    await sendAlotsSms(payload.mobileNumber, payload.otp);
    return;
  }

  console.log(`[Queue] Enqueueing SMS job for ${payload.mobileNumber}`);
  await queue.add("sms", payload, { 
    removeOnComplete: true, 
    attempts: 3,
    priority: 1 // Highest priority for OTPs
  });
}
