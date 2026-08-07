import mongoose, { Schema, Document } from "mongoose";

export interface UserPackageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  purchaseDate: Date;
  validityEndDate: Date;
  status: "PENDING" | "ACTIVE" | "EXHAUSTED" | "EXPIRED";
  totalUses: number;
  remainingUses: number;
  purchasePrice: number;
}

const userPackageSchema = new Schema<UserPackageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    packageId: { type: Schema.Types.ObjectId, ref: "HealthPackage", required: true },
    purchaseDate: { type: Date, default: Date.now },
    validityEndDate: { type: Date, required: true },
    status: { type: String, enum: ["PENDING", "ACTIVE", "EXHAUSTED", "EXPIRED"], default: "ACTIVE", index: true },
    totalUses: { type: Number, required: true },
    remainingUses: { type: Number, required: true },
    purchasePrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Method to automatically check and update status
userPackageSchema.pre("save", function (next) {
  // Do not auto-update if it is still PENDING
  if (this.status !== "PENDING") {
    if (this.remainingUses <= 0) {
      this.status = "EXHAUSTED";
    } else if (this.validityEndDate && this.validityEndDate < new Date()) {
      this.status = "EXPIRED";
    } else if (this.remainingUses > 0 && this.validityEndDate >= new Date()) {
      this.status = "ACTIVE";
    }
  }
  next();
});

export const UserPackageModel = mongoose.model<UserPackageDocument>(
  "UserPackage",
  userPackageSchema
);
