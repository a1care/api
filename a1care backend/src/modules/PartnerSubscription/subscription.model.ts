import mongoose, { Schema, Document } from "mongoose";

export interface IPartnerSubscription extends Document {
    partnerId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    status: "Active" | "Expired" | "Cancelled" | "Pending";
    paymentId?: string;
}

const PartnerSubscriptionSchema = new Schema<IPartnerSubscription>(
    {
        partnerId: { type: Schema.Types.ObjectId, ref: "staff", required: true },
        planId: { type: Schema.Types.ObjectId, ref: "PartnerSubscriptionPlan", required: true },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ["Active", "Expired", "Cancelled", "Pending"],
            default: "Active"
        },
        paymentId: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IPartnerSubscription>("PartnerSubscription", PartnerSubscriptionSchema);
