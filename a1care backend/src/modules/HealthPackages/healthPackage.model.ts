import mongoose, { Schema, Document } from "mongoose";

export interface HealthPackageDocument extends Document {
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  badge?: string; // e.g. "BEST SELLER", "NEW", "POPULAR"
  color: string;  // hex color for the card gradient
  testsIncluded: string[];
  validityDays: number;
  isActive: boolean;
  isFeatured: boolean;
  order: number; // display order
}

const healthPackageSchema = new Schema<HealthPackageDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    badge: { type: String },
    color: { type: String, default: "#2F80ED" },
    testsIncluded: { type: [String], default: [] },
    validityDays: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const HealthPackageModel = mongoose.model<HealthPackageDocument>(
  "HealthPackage",
  healthPackageSchema
);
