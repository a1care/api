import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriptionPlan extends Document {
    name: string;
    description: string;
    price: number;
    validityDays: number;
    category: string; // e.g., "Doctor", "Nurse", etc.
    commissionPercentage: number;
    tier: "Basic" | "Standard" | "Premium";
    features: string[];
    isRefundable: boolean;
    isActive: boolean;
    maxBookingsPerDay: number; // 0 or -1 means unlimited
    isFree: boolean;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
    {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 },
        validityDays: { type: Number, required: true, min: 0 }, // 0 for Basic/Always Active
        category: { type: String, required: true },
        commissionPercentage: { type: Number, required: true, min: 0, max: 100 },
        tier: { type: String, enum: ["Basic", "Standard", "Premium"], required: true },
        features: [{ type: String }],
        isRefundable: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        maxBookingsPerDay: { type: Number, default: 0 },
        isFree: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<ISubscriptionPlan>("PartnerSubscriptionPlan", SubscriptionPlanSchema);
