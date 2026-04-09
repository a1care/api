import mongoose, { Schema, Document } from "mongoose";
import * as z from 'zod'
// validation
export const doctoBlockTimeValidations = z.object({
    doctorId:z.string() , 
    startingTime:z.string() ,
    endingTime:z.string() ,
    reason:z.string() , 
    weekDays:z.array(z.number().min(0).max(6)).refine(arr=>new Set(arr).size===arr.length , {
        message:"Weekday entries must be unique buddy...."
    }) , 
    date:z.date().optional()

})  

//interface
export interface DoctorBlockTimeDocument extends Document {
  doctorId: mongoose.Types.ObjectId;
  startingTime: string;
  endingTime: string;
  reason: string;
  weekDays: number[];
  date:Date 
}

// model 
const DoctorBlockTimeSchema = new Schema<DoctorBlockTimeDocument>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    startingTime: {
      type: String, // "13:00"
      required: true
    },

    endingTime: {
      type: String, // "14:00"
      required: true
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    weekDays: {
      type: [Number], // 0 = Sunday, 6 = Saturday
      required: true,
      validate: [
        {
          validator: (days: number[]) =>
            days.every(d => d >= 0 && d <= 6),
          message: "Weekdays must be between 0 and 6"
        },
        {
          validator: (days: number[]) =>
            new Set(days).size === days.length,
          message: "Weekday entries must be unique"
        }
      ]
    } , 
    date:{
      type:Date
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<DoctorBlockTimeDocument>(
  "DoctorBlockTime",
  DoctorBlockTimeSchema
);