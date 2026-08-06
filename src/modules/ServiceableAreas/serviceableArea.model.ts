import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceableArea extends Document {
  name: string;          // e.g., "Safilguda"
  city: string;          // e.g., "Hyderabad"
  state: string;         // e.g., "Telangana"
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceableAreaSchema = new Schema<IServiceableArea>({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, default: 'Hyderabad' },
  state: { type: String, required: true, default: 'Telangana' },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

ServiceableAreaSchema.index({ city: 1, isActive: 1 });

export const ServiceableArea = mongoose.model<IServiceableArea>('ServiceableArea', ServiceableAreaSchema);
