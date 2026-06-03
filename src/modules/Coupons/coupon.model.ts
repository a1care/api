import mongoose, { Schema } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["PERCENTAGE", "FLAT"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: 0 },   // cap for percentage discounts (0 = no cap)
    minOrderAmount: { type: Number, default: 0 },       // minimum booking amount to apply
    usageLimit: { type: Number, default: 0 },           // total uses across all users (0 = unlimited)
    usagePerUser: { type: Number, default: 1 },         // max uses per user
    usedCount: { type: Number, default: 0 },
    usedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "Patient" },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },
    applicableTo: { type: String, enum: ["ALL", "SERVICE", "DOCTOR"], default: "ALL" },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", CouponSchema);
export default Coupon;
