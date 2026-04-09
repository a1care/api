import mongoose, { Schema, Document } from "mongoose";

export interface DoctorAvailabilityDocument extends Document {
  doctorId: mongoose.Types.ObjectId;
  weekDays: number[];
  startingTime: string;
  endingTime: string;
  slotDuration: string;
}

const DoctorAvailabilitySchema = new Schema<DoctorAvailabilityDocument>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    weekDays: {
      type: [Number], // 0 = Sunday, 6 = Saturday
      required: true,
      validate: {
        validator: (days: number[]) =>
          days.every(d => d >= 0 && d <= 6),
        message: "weekDays must be between 0 and 6"
      }
    },

    startingTime: {
      type: String, // "09:00"
      required: true
    },

    endingTime: {
      type: String, // "17:00"
      required: true
    },

    slotDuration: {
      type: String, // "15" (minutes)
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<DoctorAvailabilityDocument>(
  "DoctorAvailability",
  DoctorAvailabilitySchema
);
