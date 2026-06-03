import mongoose, { Schema, model, Document } from "mongoose";

export interface PatientDocument extends Document {
  mobileNumber: number;
  name: string;
  email: string;
  profileImage: string;
  location: {
    latitude: number;
    longitude: number;
  };
  gender: "Male" | "Female" | "Other";
  dateOfBirth: Date;
  fcmToken: string;
  isRegistered: boolean;
  primaryAddressId: mongoose.Schema.Types.ObjectId;
  referralCode?: string;
  referredBy?: mongoose.Schema.Types.ObjectId;
  deletionRequested?: boolean;
  deletionRequestedAt?: Date | null;
  deletedAt?: Date | null;
}

const PatientSchema = new Schema<PatientDocument>(
  {
    mobileNumber: {
      type: Number,
      required: true,
      unique: true
    },

    name: {
      type: String,
      trim: true,
      maxLength: 50
    },

    email: {
      type: String,
      lowercase: true,
      trim: true
    },

    profileImage: {
      type: String,
    },

    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      }
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    dateOfBirth: {
      type: Date,
    },

    fcmToken: {
      type: String,
    },

    isRegistered: {
      type: Boolean,
      default: false
    },
    primaryAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "patient_addresses"
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    deletionRequested: {
      type: Boolean,
      default: false
    },
    deletionRequestedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
  },
  {
    timestamps: true
  }
);

export const Patient = model<PatientDocument>(
  "Patient",
  PatientSchema
);
