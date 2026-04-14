import mongoose, { Schema, Document } from "mongoose";

export interface HospitalBookingDocument extends Document {
    bookingId: mongoose.Types.ObjectId;
    bookingType: 'doctor' | 'service';
    patientId: mongoose.Types.ObjectId;
    serviceName: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    acceptedAt: Date;
}

const HospitalBookingSchema = new Schema<HospitalBookingDocument>(
    {
        bookingId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        bookingType: {
            type: String,
            enum: ['doctor', 'service'],
            required: true
        },
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'Patient',
            required: true
        },
        serviceName: {
            type: String,
            required: true
        },
        totalAmount: {
            type: Number,
            required: true
        },
        paymentStatus: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        },
        acceptedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<HospitalBookingDocument>("HospitalBooking", HospitalBookingSchema);
