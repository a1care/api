import mongoose, { Schema, Document } from "mongoose";

export interface DoctorAppointmentDocument extends Document {
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  startingTime: string;
  endingTime: string;
  isConfirmed: boolean;
  date:Date ;
  weekDay:number;
  paymentMode?:'ONLINE' | 'OFFLINE' | 'WALLET' | 'PACKAGE' ;
  paymentStatus:'PENDING' | 'COMPLETED' | 'FAILED' ;
  status:'Pending' | 'Confirmed' | "Completed" | "Cancelled" , 
  totalAmount: number;
  commissionPercentage?: number;
  commissionAmount?: number;
  partnerEarning?: number;
  serviceName?: string;
  couponCode?: string;
  discountAmount?: number;
  consultationType?: 'OP' | 'VIRTUAL' | 'HOME_VISIT';
}

const DoctorAppointmentSchema = new Schema<DoctorAppointmentDocument>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "staff",
      required: true
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    startingTime: {
      type: String, // "09:00"
      required: true
    },

    endingTime: {
      type: String, // "09:30"
      required: true
    },

    isConfirmed: {
      type: Boolean,
      default: false
    } , 
    date:{
        type:Date,
        required:true
    } , 
    weekDay:{
        type:Number , 
        // required:true
    } , 
    status:{
      type:String ,
      enum:["PAYMENT_PENDING", "Pending" , "Confirmed" , "Completed" , "Cancelled"],
      default:"Pending"
    } , 
    paymentMode:{ 
      type:String ,
      enum:['ONLINE' , 'OFFLINE', 'WALLET', 'PACKAGE'],
    } , 
    paymentStatus:{
      type:String ,
      enum:['PENDING' , 'COMPLETED' , 'FAILED'] ,
      required:true
    } ,
    totalAmount: {
      type: Number,
      required: true,
    },
    commissionPercentage: {
      type: Number,
      default: 0
    },
    commissionAmount: {
      type: Number,
      default: 0
    },
    partnerEarning: {
      type: Number,
      default: 0
    },
    serviceName: {
      type: String
    },
    couponCode: {
      type: String
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    consultationType: {
      type: String,
      enum: ['OP', 'VIRTUAL', 'HOME_VISIT'],
      default: 'OP'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<DoctorAppointmentDocument>(
  "DoctorAppointment",
  DoctorAppointmentSchema
);
