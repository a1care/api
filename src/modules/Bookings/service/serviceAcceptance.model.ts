import mongoose, { Schema } from "mongoose";
import { required } from "zod/mini";

const serviceAcceptanceSchema = new Schema({
    serviceRequestId:{
         type:Schema.Types.ObjectId , 
         requried:true , 
         unique:true
    } , 
    providerId:{
        type:Schema.Types.ObjectId , 
        required:true 
    }, 
    roleId:{
        type:Schema.Types.ObjectId , 
        required:true 
    },
    patientId:{
        type:Schema.Types.ObjectId , 
        required:true
    } ,
    price:{
        type:Number, 
        required:true
    } , 
    status:{
        type:String , 
        enum:["ACCEPTED", "REJECTED", "EXPIRED" , 'COMPLETED'] ,
        default:"ACCEPTED"
    }
})

const serviceAcceptanceModal = mongoose.model("serviceAcceptance" , serviceAcceptanceSchema)
export default serviceAcceptanceModal