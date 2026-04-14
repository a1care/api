import mongoose, { Schema, type Document } from "mongoose";

export interface AuditLogDocument extends Document {
  actorAdminId: mongoose.Types.ObjectId;
  actorRole: "admin" | "super_admin";
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    actorAdminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    actorRole: { type: String, enum: ["admin", "super_admin"], required: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model<AuditLogDocument>("AuditLog", AuditLogSchema);

