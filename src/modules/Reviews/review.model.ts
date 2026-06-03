import mongoose, { Schema, Document } from "mongoose";

export interface ReviewDocument extends Document {
    userId: mongoose.Types.ObjectId;
    doctorId?: mongoose.Types.ObjectId;
    childServiceId?: mongoose.Types.ObjectId;
    bookingId: mongoose.Types.ObjectId;
    bookingType: "Doctor" | "Service";
    rating: number;
    comment: string;
    status: "Pending" | "Active" | "Hidden";
    reviewerType: "patient" | "partner";
}

const ReviewSchema = new Schema<ReviewDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: "doctor",
        },
        childServiceId: {
            type: Schema.Types.ObjectId,
            ref: "childService",
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        bookingType: {
            type: String,
            enum: ["Doctor", "Service"],
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Active", "Hidden"],
            default: "Active",
        },
        // Who submitted the review. Only "patient" reviews count toward public provider/
        // service rating averages; "partner" reviews (partner rating the customer) are
        // visible in admin but excluded from public stars.
        reviewerType: {
            type: String,
            enum: ["patient", "partner"],
            default: "patient",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ReviewDocument>("Review", ReviewSchema);
