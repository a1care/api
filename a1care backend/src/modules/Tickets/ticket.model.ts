import mongoose, { Schema, Document } from "mongoose";

export interface TicketDocument extends Document {
    staffId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    subject: string;
    description: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    priority: "Low" | "Medium" | "High";
}

const TicketSchema = new Schema<TicketDocument>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: "staff",
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "user",
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Closed"],
            default: "Pending",
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<TicketDocument>("ticket", TicketSchema);
