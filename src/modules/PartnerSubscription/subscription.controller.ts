import type { Request, Response } from "express";
import PartnerSubscriptionPlan from "./plan.model.js";
import PartnerSubscription from "./subscription.model.js";
import { enqueuePush } from "../../queues/communicationQueue.js";
import doctorModel from "../Doctors/doctor.model.js";
import { Order, OrderStatus } from "../Payments/payment.model.js";
import { v4 as uuidv4 } from "uuid";

export const getCategories = async (req: Request, res: Response) => {
    try {
        const cats = await PartnerSubscriptionPlan.distinct("category");
        res.status(200).json({ success: true, data: cats });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const { category, all } = req.query;
        const filter: any = {};
        if (all !== "true") filter.isActive = true;
        if (category && (category as string).toLowerCase() !== "all") {
            filter.category = { $in: [category, "All", "ALL", "all"] };
        }

        const plans = await PartnerSubscriptionPlan.find(filter).sort({ price: 1 });
        res.status(200).json({ success: true, data: plans });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await PartnerSubscriptionPlan.create(req.body);
        res.status(201).json({ success: true, data: plan });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        const plan = await PartnerSubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: plan });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        await PartnerSubscriptionPlan.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Plan deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const subscribe = async (req: Request, res: Response) => {
    try {
        const { planId, paymentMode } = req.body;
        const partnerId = (req as any).user?.id;

        if (!partnerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const plan = await PartnerSubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        // Limit free plan subscriptions to once per partner
        if (plan.isFree) {
            const hasHadFreePlan = await PartnerSubscription.findOne({
                partnerId,
                planId: plan._id,
                status: { $in: ["Active", "Expired", "Cancelled", "Pending"] }
            });
            if (hasHadFreePlan) {
                return res.status(400).json({ success: false, message: "You have already used the Free Plan once. Please select a paid subscription plan." });
            }
        }

        const startDate = new Date();
        const endDate = new Date();
        
        if (plan.validityDays === 0) {
            endDate.setFullYear(endDate.getFullYear() + 100); // Lifetime
        } else {
            endDate.setDate(startDate.getDate() + plan.validityDays);
        }

        // Cancel any existing Pending or incomplete subscriptions first to avoid clutter
        await PartnerSubscription.updateMany(
            { partnerId, status: { $in: ["Pending", "PAYMENT_PENDING"] } },
            { status: "Cancelled" }
        );

        const subscription: any = await PartnerSubscription.create({
            partnerId,
            planId,
            startDate,
            endDate,
            status: plan.price > 0 ? "PAYMENT_PENDING" : "Active"
        });

        // ── If Paid, Create a Payment Order ──────────────────────────────────
        let order = null;
        if (plan.price > 0) {
            if (paymentMode === "WALLET") {
                // Partner "Wallet" is actually their dynamic Earnings balance.
                const mongoose = (await import("mongoose")).default;
                const Payout = (await import("../Earnings/payout.model.js")).default;
                const { getActiveCommissionRate } = await import("../PartnerSubscription/subscription.controller.js");
                const doctorAppointmentModel = (await import("../Bookings/doctorAppointment.model.js")).default;
                const serviceRequestModel = (await import("../Bookings/service/serviceRequest.model.js")).default;

                const commissionPct = await getActiveCommissionRate(partnerId);
                const earningRatio = (100 - commissionPct) / 100;

                // Server-side balance verification
                const [apptEarnings, serviceEarnings, totalWithdrawn] = await Promise.all([
                    doctorAppointmentModel.aggregate([
                        { $match: { doctorId: new mongoose.Types.ObjectId(partnerId), status: "Completed", paymentStatus: "COMPLETED" } },
                        { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } } } }
                    ]),
                    serviceRequestModel.aggregate([
                        { $match: { assignedProviderId: new mongoose.Types.ObjectId(partnerId), status: "COMPLETED" } },
                        { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } } } }
                    ]),
                    Payout.aggregate([
                        { $match: { staffId: new mongoose.Types.ObjectId(partnerId), status: { $in: ["PENDING", "APPROVED", "COMPLETED"] } } },
                        { $group: { _id: null, sum: { $sum: "$amount" } } }
                    ])
                ]);

                const totalEarned = (apptEarnings[0]?.sum || 0) + (serviceEarnings[0]?.sum || 0);
                const alreadyWithdrawn = totalWithdrawn[0]?.sum || 0;
                const availableBalance = totalEarned - alreadyWithdrawn;

                if (availableBalance < plan.price) {
                    await PartnerSubscription.findByIdAndDelete(subscription._id);
                    return res.status(400).json({ success: false, message: `Insufficient wallet balance. Available: ₹${availableBalance.toFixed(2)}, Required: ₹${plan.price}` });
                }

                // Deduct by creating a completed Payout record
                const Doctor = (await import("../Doctors/doctor.model.js")).default;
                const staff = await Doctor.findById(partnerId);
                
                await Payout.create({
                    staffId: partnerId,
                    partnerName: staff?.name || "A1Care Partner",
                    partnerMobile: staff?.mobileNumber || "",
                    amount: plan.price,
                    status: "COMPLETED",
                    adminNote: `Subscription purchase: ${plan.name}`,
                });

                subscription.status = "Active";
                subscription.paymentId = `WALLET-${Date.now()}`;
                await subscription.save();

                // New subscription is active, cancel any previous active subscriptions
                await PartnerSubscription.updateMany(
                    { partnerId, _id: { $ne: subscription._id }, status: "Active" },
                    { status: "Cancelled" }
                );

                return res.status(201).json({ 
                    success: true, 
                    data: { 
                        subscription, 
                        requiresPayment: false 
                    } 
                });
            } else {
                order = await Order.create({
                    userId: partnerId,
                    amount: plan.price,
                    type: "SUBSCRIPTION",
                    referenceId: subscription._id.toString(),
                    txnId: `SUB-${uuidv4().split("-")[0]}-${Date.now()}`,
                    status: OrderStatus.PENDING,
                });
            }
        }

        if (subscription.status === "Active") {
            // New subscription is active, cancel any previous active subscriptions
            await PartnerSubscription.updateMany(
                { partnerId, _id: { $ne: subscription._id }, status: "Active" },
                { status: "Cancelled" }
            );
        }

        res.status(201).json({ 
            success: true, 
            data: { 
                subscription, 
                order,
                requiresPayment: plan.price > 0 && paymentMode !== "WALLET"
            } 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMySubscription = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        
        let subscription: any = await PartnerSubscription.findOne({
            partnerId,
            status: { $in: ["Active", "Expired"] },
        }).populate("planId").sort({ createdAt: -1 });

        if (subscription) {
            let isExpired = false;
            let isInGracePeriod = false;
            const isLifetime = subscription.planId?.validityDays === 0;
            const now = new Date().getTime();
            const endDateMs = new Date(subscription.endDate).getTime();
            isExpired = endDateMs < now;
            
            if (isLifetime) {
                // Auto-heal old lifetime subscriptions that were incorrectly assigned 30 days
                if (isExpired || new Date(subscription.endDate).getFullYear() < 2050) {
                    const newEndDate = new Date();
                    newEndDate.setFullYear(newEndDate.getFullYear() + 100);
                    subscription.endDate = newEndDate;
                    await PartnerSubscription.findByIdAndUpdate(subscription._id, { endDate: newEndDate });
                    isExpired = false;
                }
            } else if (isExpired) {
                const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
                isInGracePeriod = now <= (endDateMs + gracePeriodMs);
                
                if (subscription.status === "Active") {
                    await PartnerSubscription.findByIdAndUpdate(subscription._id, { status: "Expired" });
                    subscription.status = "Expired";
                }
            }
            
            subscription = subscription.toObject();
            subscription.isExpired = isExpired;
            subscription.isInGracePeriod = isInGracePeriod;
        }

        res.status(200).json({ success: true, data: subscription });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getHistory = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const history = await PartnerSubscription.find({ partnerId })
            .populate("planId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getAdminSubscriptions = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status) filter.status = status;

        const subs = await PartnerSubscription.find(filter)
            .populate("planId")
            .populate("partnerId", "name mobileNumber roleId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: subs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const approveSubscription = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sub = await PartnerSubscription.findByIdAndUpdate(id, { status: "Active" }, { new: true });
        if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });

        // Notify Partner
        const partner = await doctorModel.findById(sub.partnerId);
        if (partner) {
            await enqueuePush({
                recipientId: String(partner._id),
                recipientType: "partner",
                fcmToken: partner.fcmToken ?? undefined,
                title: "Plan Activated! 🚀",
                body: "Your subscription has been approved. You're now ready to accept more jobs.",
                data: { type: "SUBSCRIPTION_ACTIVE", subId: String(sub._id) }
            });
        }

        res.status(200).json({ success: true, data: sub });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getActiveCommissionRate = async (partnerId: string) => {
    try {
        let subscription: any = await PartnerSubscription.findOne({
            partnerId,
            status: { $in: ["Active", "Expired"] },
        }).populate("planId").sort({ createdAt: -1 });

        if (subscription) {
            const isLifetime = subscription.planId?.validityDays === 0;
            const now = new Date().getTime();
            const endDateMs = new Date(subscription.endDate).getTime();
            const isExpired = endDateMs < now;
            
            if (isLifetime) {
                if (isExpired || new Date(subscription.endDate).getFullYear() < 2050) {
                    const newEndDate = new Date();
                    newEndDate.setFullYear(newEndDate.getFullYear() + 100);
                    subscription.endDate = newEndDate;
                    await PartnerSubscription.findByIdAndUpdate(subscription._id, { endDate: newEndDate });
                }
            } else if (isExpired) {
                if (subscription.status === "Active") {
                    await PartnerSubscription.findByIdAndUpdate(subscription._id, { status: "Expired" });
                }
                const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
                if (now > (endDateMs + gracePeriodMs)) {
                    subscription = null; // Block benefits beyond grace period
                }
            }
        }

        if (subscription && subscription.planId) {
            return subscription.planId.commissionPercentage;
        }
    } catch (error) {
        console.error("Error fetching commission rate:", error);
    }
    return 20; // Default fallback
};
