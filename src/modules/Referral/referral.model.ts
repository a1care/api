import mongoose, { Schema } from "mongoose";

const ReferralSchema = new Schema(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    refereeId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      unique: true, // each referee can only ever be referred (and rewarded) once
    },
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "REWARDED"],
      default: "PENDING",
    },
    rewardAmount: {
      type: Number,
      default: 100,
    },
    appliedOnBookingId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Referral", ReferralSchema);
