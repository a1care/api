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
  gender: "Male" | "Gender" | "Other";
  dateOfBirth: Date;
  fcmToken: string;
  isRegistered: boolean;
  primaryAddressId:mongoose.Schema.Types.ObjectId
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
      trim: true
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
      enum: ["Male", "Gender", "Other"],
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
    primaryAddressId:{
      type:mongoose.Schema.Types.ObjectId , 
      ref:"patient_addresses"
    }
  },
  {
    timestamps: true
  }
);

export const Patient = model<PatientDocument>(
  "Patient",
  PatientSchema
);
