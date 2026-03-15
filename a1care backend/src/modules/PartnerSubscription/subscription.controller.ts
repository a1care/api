import type { Request, Response } from "express";
import PartnerSubscriptionPlan from "./plan.model.js";
import PartnerSubscription from "./subscription.model.js";

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

        const subscription = await PartnerSubscription.create({
            partnerId,
            planId,
            startDate,
            endDate,
            status: "Active"
        });

        res.status(201).json({ success: true, data: subscription });
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
