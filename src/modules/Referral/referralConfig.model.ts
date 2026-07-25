import mongoose, { Schema, Document } from "mongoose";

export interface IReferralConfig extends Document {
  customerRewardAmount: number;
  partnerRewardAmount: number;
}

const ReferralConfigSchema = new Schema<IReferralConfig>(
  {
    customerRewardAmount: {
      type: Number,
      required: true,
      default: 100,
    },
    partnerRewardAmount: {
      type: Number,
      required: true,
      default: 100,
    },
  },
  { timestamps: true }
);

// Ensure there is only ever one config document
ReferralConfigSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.models.ReferralConfig.countDocuments();
    if (count > 0) {
      return next(new Error("Only one ReferralConfig document can exist"));
    }
  }
  next();
});

const ReferralConfig = mongoose.model<IReferralConfig>("ReferralConfig", ReferralConfigSchema);
export default ReferralConfig;
