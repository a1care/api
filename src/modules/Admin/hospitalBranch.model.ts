import mongoose, { Document, Schema } from 'mongoose';

export interface IHospitalBranch extends Document {
  name: string;
  addressText?: string;
  location: {
    lat: number;
    lng: number;
  };
  ambulanceRadiusKm: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalBranchSchema = new Schema<IHospitalBranch>({
  name: { type: String, required: true },
  addressText: { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  ambulanceRadiusKm: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const HospitalBranch = mongoose.model<IHospitalBranch>('HospitalBranch', HospitalBranchSchema);
