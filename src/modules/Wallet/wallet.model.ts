import mongoose, { Schema, Document } from "mongoose";

export interface Transaction {
    amount: number;
    type: "Credit" | "Debit";
    description: string;
    date: Date;
}

export interface WalletDocument extends Document {
    userId: mongoose.Types.ObjectId;
    onModel: "Patient" | "Staff";
    balance: number;
    transactions: Transaction[];
}

const WalletSchema = new Schema<WalletDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            refPath: "onModel",
            required: true,
            unique: true,
        },
        onModel: {
            type: String,
            required: true,
            enum: ["Patient", "Staff"],
            default: "Patient"
        },
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        transactions: [
            {
                amount: { type: Number, required: true },
                type: { type: String, enum: ["Credit", "Debit"], required: true },
                description: { type: String, required: true },
                date: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<WalletDocument>("Wallet", WalletSchema);
