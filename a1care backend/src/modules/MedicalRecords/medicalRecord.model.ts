import mongoose, { Schema, type Document } from "mongoose";

export interface MedicalRecordDocument extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  clinicalNotes?: string;
  diagnosis?: string;
  prescriptions: string[];
  labReports: string[];
}

const MedicalRecordSchema = new Schema<MedicalRecordDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "staff",
      index: true
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "DoctorAppointment",
      index: true
    },
    clinicalNotes: {
      type: String,
      default: ""
    },
    diagnosis: {
      type: String,
      default: ""
    },
    prescriptions: {
      type: [String],
      default: []
    },
    labReports: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model<MedicalRecordDocument>("MedicalRecord", MedicalRecordSchema);

