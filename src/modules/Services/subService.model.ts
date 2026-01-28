import { Schema, model, Document, Types } from "mongoose";

export interface SubServiceDocument extends Document {
  name: string;
  description: string;
  isActive: boolean;
  serviceId: Types.ObjectId;
  imageUrl: string;
}

const SubServiceSchema = new Schema<SubServiceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },

    imageUrl: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const SubService = model<SubServiceDocument>(
  "SubService",
  SubServiceSchema
);
