import mongoose, { Schema, Document } from "mongoose";

export interface DoctorDocument extends Document {
  name: string;
  mobileNumber:string;
  gender: "Male" | "Female" | "Other";
  startExperience: Date;
  specialization: string[];
  status: "Pending" | "Active" | "Inactive";
  consultationFee: number;
  about: string;
  workingHours: string;
  doctorDetailsId: mongoose.Types.ObjectId;
  rating: number;
  completed: number; 
  roleId:mongoose.Types.ObjectId;
  documentId?:mongoose.Types.ObjectId;
  fulfillmentMode:"HOME_VISIT" |  "HOSPITAL_VISIT"| "VIRTUAL" , 
  isRegistered:boolean
  
}

const DoctorSchema = new Schema<DoctorDocument>(
  {
    name: {
      type: String,
      // required: true,
      trim: true
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      // required: true
    },

    startExperience: {
      type: Date,
      // required: true,
      min: 0
    },

    specialization: {
      type: [String],
      // required: true
    },

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Pending"
    },

    consultationFee: {
      type: Number,
      // required: true,
      min: 0
    },

    about: {
      type: String,
      // required: true,
      trim: true
    },

    workingHours: {
      type: String, // e.g. "09:00 - 17:00"
      // required: true
    },

    doctorDetailsId: {
      type: Schema.Types.ObjectId,
      ref: "DoctorDetails",
      // required: true
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
    } , 
     documentId:{
        type:Schema.Types.ObjectId ,
     } , 
    //  fulfillmentMode:{
    //   type:String , 
    //   enum:["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"] , 
    //   required:true
    //  } ,
    roleId:{
      type:Schema.Types.ObjectId , 
      ref:"Role" ,    
  },
  isRegistered:{
    type:Boolean , 
    default:false
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
