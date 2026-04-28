import { Schema, model } from "mongoose";

const UserAddressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    label: {
      type: String,
      enum: [
        "HOME",
        "WORK",
        "OTHERS",
        "FRIEND",
        "FAMILY"
      ],
      required: true
    },

    location: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },

    state: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },

    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },

    // Primary address line (house no / flat / street / area)
    street: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },

    // Optional explicit house number for structured use-cases
    houseNo: {
      type: String,
      trim: true
    },

    // Backward-compatible aliases from older/newer clients
    address: {
      type: String,
      trim: true
    },

    addressLine1: {
      type: String,
      trim: true
    },

    pincode: {
      type: String,
      required: true,
      match: /^\d{6}$/
    },

    landmark: {
      type: String,
      trim: true
    },

    moreInfo: {
      type: String,
      trim: true
    },
    isDeleted:{
      type:Boolean,
      default:false
    }
  },
  { timestamps: true }
);

/* Helpful index for fast lookup */
UserAddressSchema.index({ userId: 1 });

export const UserAddressModel = model(
  "patient_addresses",
  UserAddressSchema
);
