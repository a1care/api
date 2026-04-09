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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ReviewDocument>("Review", ReviewSchema);
