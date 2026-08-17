import mongoose, { Schema, Document } from "mongoose";

export interface TicketDocument extends Document {
    staffId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    bookingId?: mongoose.Types.ObjectId;
    bookingType?: "ServiceRequest" | "DoctorAppointment";
    category?: "General" | "Billing" | "Dispute" | "Technical" | "Other";
    subject: string;
    description: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    priority: "Low" | "Medium" | "High" | "Critical";
}

const TicketSchema = new Schema<TicketDocument>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: "staff",
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "Patient",
        },
        bookingId: {
            type: Schema.Types.ObjectId,
        },
        bookingType: {
            type: String,
            enum: ["ServiceRequest", "DoctorAppointment"],
        },
        category: {
            type: String,
            enum: ["General", "Billing", "Dispute", "Technical", "Other"],
            default: "General",
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
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<TicketDocument>("ticket", TicketSchema);
