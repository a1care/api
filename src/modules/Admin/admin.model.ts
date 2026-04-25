import mongoose, { Schema, type Document } from "mongoose";

export type AdminRole = "admin" | "super_admin";

export interface AdminDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
}

const AdminSchema = new Schema<AdminDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "super_admin"], required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export const Admin = mongoose.model<AdminDocument>("Admin", AdminSchema);

