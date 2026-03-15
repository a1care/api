import mongoose, { Schema, Document } from "mongoose";

export interface DoctorDocument extends Document {
  name: string;
  mobileNumber: string;
  gender: "Male" | "Female" | "Other";
  startExperience: Date;
  specialization: string[];
  status: "Pending" | "Active" | "Inactive";
  consultationFee: number;
  homeConsultationFee: number;
  onlineConsultationFee: number;
  about: string;
  workingHours: string;
  serviceRadius?: number;
  profileImage?: string;
  doctorDetailsId: mongoose.Types.ObjectId;
  rating: number;
  completed: number;
  roleId: mongoose.Types.ObjectId;
  documents: { type: string; url: string }[];
  fulfillmentMode: "HOME_VISIT" | "HOSPITAL_VISIT" | "VIRTUAL";
  isRegistered: boolean;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };
  fcmToken?: string;
}

const DoctorSchema = new Schema<DoctorDocument>(
  {
    name: {
      type: String,
      trim: true
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    startExperience: {
      type: Date,
      min: 0
    },

    specialization: {
      type: [String],
    },

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Pending"
    },

    consultationFee: {
      type: Number,
      min: 0
    },
    homeConsultationFee: {
      type: Number,
      min: 0
    },
    onlineConsultationFee: {
      type: Number,
      min: 0
    },

    about: {
      type: String,
      trim: true
    },

    workingHours: {
      type: String,
    },
    serviceRadius: {
      type: Number,
      min: 0,
    },
    profileImage: {
      type: String,
    },

    doctorDetailsId: {
      type: Schema.Types.ObjectId,
      ref: "DoctorDetails",
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    completed: {
      type: Number,
      default: 0,
      min: 0
    },

    documents: [
      {
        type: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],

    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true
    },

    isRegistered: {
      type: Boolean,
      default: false
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String
    },
    fcmToken: {
      type: String,
      default: null
    }
  },

  {
    timestamps: true
  }
);

export default mongoose.model<DoctorDocument>(
  "staff",
  DoctorSchema
);
