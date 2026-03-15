import mongoose, { Schema, Document } from "mongoose";

export interface ChildServiceDocument extends Document {
  name: string;
  description: string;
  serviceId: Schema.Types.ObjectId;
  subServiceId: Schema.Types.ObjectId;
  price: number;
  selectionType: "SELECT" | "ASSIGN";
  isActive: boolean;
  allowedRoleIds: string[];
  imageUrl: string;
  /** Optional hospital/partner who gets first notification (10s window) before broadcast to all */
  hospitalProviderId?: Schema.Types.ObjectId;
}

const childServiceSchema = new Schema<ChildServiceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    subServiceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    selectionType: {
      type: String,
      enum: ["SELECT", "ASSIGN"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    allowedRoleIds: {
      type: [String],
    },

    imageUrl: {
      type: String,
    },
    hospitalProviderId: {
      type: Schema.Types.ObjectId,
      ref: "staff",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ChildServiceModel = mongoose.model<ChildServiceDocument>(
  "ChildService",
  childServiceSchema
);
