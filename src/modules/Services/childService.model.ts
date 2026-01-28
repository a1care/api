import mongoose, { Schema, Document } from "mongoose";

export interface ChildServiceDocument extends Document {
  name: string;
  description: string;
  serviceId: Schema.Types.ObjectId;
  subServiceId: Schema.Types.ObjectId;
  price: number;
  bookingType: "SELECT" | "ASSIGN";
  isActive: boolean;
  allowedRoleIds: string[];
  imageUrl: string;
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

    bookingType: {
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
  },
  {
    timestamps: true,
  }
);

export const ChildServiceModel = mongoose.model<ChildServiceDocument>(
  "ChildService",
  childServiceSchema
);
