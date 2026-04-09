import mongoose, { Schema, Document } from "mongoose";

export interface PayoutDocument extends Document {
  staffId: mongoose.Types.ObjectId;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<PayoutDocument>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "staff",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING"
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String
    },
    adminNote: String
  },
  { timestamps: true }
);

export default mongoose.model<PayoutDocument>("Payout", PayoutSchema);
