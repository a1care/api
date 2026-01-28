import { Schema, model, Document } from "mongoose";

export interface ServiceDocument extends Document {
  name: string;
  title: string;
  type: "SELECT" | "ASSIGN";
  imageUrl: string;
  isActive: boolean;
}

const ServiceSchema = new Schema<ServiceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["SELECT", "ASSIGN"],
      required: true
    },

    imageUrl: {
      type: String,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Service = model<ServiceDocument>(
  "Service",
  ServiceSchema
);
