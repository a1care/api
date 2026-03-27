import type { Request, Response } from "express";
import PartnerSubscriptionPlan from "./plan.model.js";
import PartnerSubscription from "./subscription.model.js";
import { enqueuePush } from "../../queues/communicationQueue.js";
import doctorModel from "../Doctors/doctor.model.js";
import { Order, OrderStatus } from "../Payments/payment.model.js";
import { v4 as uuidv4 } from "uuid";

export const getPlans = async (req: Request, res: Response) => {
    try {
        const { category } = req.query;
        const filter: any = { isActive: true };
        if (category) filter.category = category;

        const plans = await PartnerSubscriptionPlan.find(filter);
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
        const { planId } = req.body;
        const partnerId = (req as any).user?.id;

        if (!partnerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const plan = await PartnerSubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + plan.validityDays);

        // Cancel any existing active subscriptions first (optional, depends on business logic)
        await PartnerSubscription.updateMany(
            { partnerId, status: "Active" },
            { status: "Cancelled" }
        );

        const subscription: any = await PartnerSubscription.create({
            partnerId,
            planId,
            startDate,
            endDate,
            status: plan.price > 0 ? "Pending" : "Active"
        });

        // ── If Paid, Create a Payment Order ──────────────────────────────────
        let order = null;
        if (plan.price > 0) {
            order = await Order.create({
                userId: partnerId,
                amount: plan.price,
                type: "SUBSCRIPTION",
                referenceId: subscription._id.toString(),
                txnId: `SUB-${uuidv4().split("-")[0]}-${Date.now()}`,
                status: OrderStatus.PENDING,
            });
        }

        res.status(201).json({ 
            success: true, 
            data: { 
                subscription, 
                order,
                requiresPayment: plan.price > 0 
            } 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMySubscription = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const subscription = await PartnerSubscription.findOne({
            partnerId,
            status: "Active",
            endDate: { $gte: new Date() }
        }).populate("planId");

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
        if (partner?.fcmToken) {
            await enqueuePush({
                recipientId: String(partner._id),
                recipientType: "staff" as any, // staff/doctor as per schema
                fcmToken: partner.fcmToken,
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
        const subscription: any = await PartnerSubscription.findOne({
            partnerId,
            status: "Active",
            endDate: { $gte: new Date() }
        }).populate("planId");

        if (subscription && subscription.planId) {
            return subscription.planId.commissionPercentage;
        }
    } catch (error) {
        console.error("Error fetching commission rate:", error);
    }
    return 20; // Default fallback
};
