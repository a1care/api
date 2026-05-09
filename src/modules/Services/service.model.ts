import { Schema, model, Document } from "mongoose";

export interface ServiceDocument extends Document {
  name: string;
  title: string;
  type: "SELECT" | "ASSIGN" | "doctor" | "nurse" | "lab" | "ambulance" | "rental" | "service";
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
      enum: ["SELECT", "ASSIGN", "doctor", "nurse", "lab", "ambulance", "rental", "service"],
      required: true,
      trim: true
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
