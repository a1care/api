import cron from "node-cron";
import mongoose from "mongoose";
import Coupon from "../modules/Coupons/coupon.model.js";
import { Patient } from "../modules/Authentication/patient.model.js";
import { enqueuePushToMany } from "../queues/communicationQueue.js";
import type { MultiPushTarget } from "../utils/sendPushNotification.js";

export const initCouponReminderJob = () => {
    // Run every day at 9:00 AM
    cron.schedule("0 9 * * *", async () => {
        if (mongoose.connection.readyState !== 1) return;
        
        try {
            const now = new Date();
            // Look for active coupons expiring in the next 24 to 48 hours
            const expiryWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

            const expiringCoupons = await Coupon.find({
                isActive: true,
                validTo: { $gte: now, $lte: expiryWindow },
                expiryNotified: { $ne: true }
            });

            if (!expiringCoupons.length) return;

            // Fetch all active patients with FCM tokens
            // To be memory efficient in a real production environment, 
            // you might want to paginate or use aggregation, but for typical scale this is fine.
            const patients = await Patient.find({
                fcmToken: { $exists: true, $ne: "" },
                isDeleted: false,
                isRegistered: true
            }).select('_id fcmToken').lean();

            if (!patients.length) return;

            for (const coupon of expiringCoupons) {
                // Count how many times each user used this coupon
                const usageMap = new Map<string, number>();
                if (coupon.usedBy && Array.isArray(coupon.usedBy)) {
                    for (const usage of coupon.usedBy) {
                        const uid = String(usage.userId);
                        usageMap.set(uid, (usageMap.get(uid) || 0) + 1);
                    }
                }

                const targets: MultiPushTarget[] = [];

                for (const patient of patients) {
                    const timesUsed = usageMap.get(String(patient._id)) || 0;
                    
                    // Skip if the user has already exhausted their allowed usage
                    if (coupon.usagePerUser > 0 && timesUsed >= coupon.usagePerUser) {
                        continue;
                    }

                    if (patient.fcmToken) {
                        targets.push({
                            recipientId: String(patient._id),
                            recipientType: "patient",
                            fcmToken: patient.fcmToken
                        });
                    }
                }

                if (targets.length > 0) {
                    const discountText = coupon.discountType === "PERCENTAGE" 
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} OFF`;

                    const title = `🕒 Last Chance: ${coupon.code} Expires Soon!`;
                    const body = `Your ${discountText} coupon is expiring soon. Don't miss out, book a service now!`;
                    
                    // We can chunk targets if they are too large, but enqueuePushToMany handles many targets well.
                    // For massive scales (e.g. 100k+ users), we should chunk.
                    const chunkSize = 500;
                    for (let i = 0; i < targets.length; i += chunkSize) {
                        const chunk = targets.slice(i, i + chunkSize);
                        await enqueuePushToMany(
                            chunk,
                            title,
                            body,
                            { type: "COUPON_REMINDER", couponCode: coupon.code }
                        );
                    }
                }

                // Mark coupon as notified so we don't send blasts again
                coupon.expiryNotified = true;
                await coupon.save();
            }

        } catch (error) {
            console.error("[Cron] Error in couponReminderJob:", error);
        }
    });
};
