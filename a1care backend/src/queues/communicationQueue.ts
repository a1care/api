import { Queue } from "bullmq";
import type { PushPayload, MultiPushTarget } from "../utils/sendPushNotification.js";
import { sendPush, sendPushToMany } from "../utils/sendPushNotification.js";
import {
  sendAppointmentConfirmationEmail,
  sendWalletTopupEmail,
  sendWelcomeEmail,
} from "../utils/email.js";
import { getQueueRedisConnection } from "./redisConnection.js";

type EmailJob =
  | { kind: "welcome"; data: Parameters<typeof sendWelcomeEmail>[0] }
  | { kind: "appointment"; data: Parameters<typeof sendAppointmentConfirmationEmail>[0] }
  | { kind: "wallet_topup"; data: Parameters<typeof sendWalletTopupEmail>[0] };

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
    if (payload.kind === "appointment") await sendAppointmentConfirmationEmail(payload.data);
    if (payload.kind === "wallet_topup") await sendWalletTopupEmail(payload.data);
    return;
  }

  await queue.add("email", payload, { removeOnComplete: true, attempts: 3 });
}

export async function enqueueSms(payload: SmsJob) {
  if (!queue) {
    const sendAlotsSms = (await import("../utils/alotsSms.js")).default;
    await sendAlotsSms(payload.mobileNumber, payload.otp);
    return;
  }

  await queue.add("sms", payload, { removeOnComplete: true, attempts: 3 });
}
