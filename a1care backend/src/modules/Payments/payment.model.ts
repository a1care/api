import mongoose, { Schema, Document } from "mongoose";

export enum OrderStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  VERIFICATION_PENDING = "VERIFICATION_PENDING",
}

export enum PaymentStatus {
  INITIATED = "INITIATED",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  FLAGGED = "FLAGGED",
}

// ─── Order Schema ────────────────────────────────────────────────────────────
export interface IOrder extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  amount: number;
  currency: string;
  status: OrderStatus;
  type: "WALLET_TOPUP" | "BOOKING";
  referenceId?: string; // e.g. Booking ID if type is BOOKING
  txnId: string; // Unique transaction ID sent to gateway
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    type: { type: String, enum: ["WALLET_TOPUP", "BOOKING"], required: true },
    referenceId: { type: String },
    txnId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// ─── Payment Transaction Schema ──────────────────────────────────────────────
export interface IPaymentTransaction extends Document {
  orderId: mongoose.Schema.Types.ObjectId;
  gatewayTxnId: string;
  gatewayName: string;
  paymentMethod?: string;
  gatewayResponse?: any;
  status: PaymentStatus;
  amount: number;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    gatewayTxnId: { type: String },
    gatewayName: { type: String, default: "EASEBUZZ" },
    paymentMethod: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.INITIATED },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

// ─── Payment Log Schema ──────────────────────────────────────────────────────
export interface IPaymentLog extends Document {
  txnId: string;
  event: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  metadata?: any;
}

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    txnId: { type: String, required: true, index: true },
    event: { type: String, required: true },
    level: { type: String, enum: ["INFO", "WARN", "ERROR"], default: "INFO" },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
export const PaymentTransaction = mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);
export const PaymentLog = mongoose.model<IPaymentLog>("PaymentLog", PaymentLogSchema);
