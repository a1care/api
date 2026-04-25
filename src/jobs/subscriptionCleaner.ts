import PartnerSubscription from "../modules/PartnerSubscription/subscription.model.js";
import { enqueuePush } from "../queues/communicationQueue.js";
import Doctor from "../modules/Doctors/doctor.model.js";

export async function runSubscriptionCleanup() {
    try {
        console.log("[JOBS] Running Subscription Cleanup...");
        const expired = await PartnerSubscription.find({
            status: "Active",
            endDate: { $lt: new Date() }
        });

        if (expired.length === 0) return;

        console.log(`[JOBS] Found ${expired.length} expired subscriptions.`);

        for (const sub of expired) {
            await PartnerSubscription.findByIdAndUpdate(sub._id, { status: "Expired" });
            
            // Notify Partner
            const partner = await Doctor.findById(sub.partnerId);
            if (partner?.fcmToken) {
                await enqueuePush({
                    recipientId: String(partner._id),
                    recipientType: "staff" as any,
                    fcmToken: partner.fcmToken,
                    title: "Subscription Expired 🔄",
                    body: "Your active plan has expired. Please renew to continue receiving job requests.",
                    data: { type: "SUBSCRIPTION_EXPIRED", subId: String(sub._id) }
                });
            }
        }
    } catch (err) {
        console.error("[JOBS] Cleanup Error:", err);
    }
}
