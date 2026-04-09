import mongoose, { Schema, Document } from "mongoose";

export interface ILocation extends Document {
    userId: mongoose.Types.ObjectId;
    userType: 'Staff' | 'User';
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    isOnline: boolean;
}

const LocationSchema = new Schema<ILocation>(
    {
        userId: { type: Schema.Types.ObjectId, required: true, unique: true },
        userType: { type: String, enum: ['Staff', 'User'], required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        heading: { type: Number, default: 0 },
        speed: { type: Number, default: 0 },
        isOnline: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Index for geoqueries
LocationSchema.index({ userId: 1 });

export default mongoose.model<ILocation>("location", LocationSchema);
