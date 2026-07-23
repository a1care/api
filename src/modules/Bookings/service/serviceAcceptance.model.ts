import mongoose, { Schema } from "mongoose";
import { required } from "zod/mini";

const serviceAcceptanceSchema = new Schema({
    serviceRequestId:{
         type:Schema.Types.ObjectId , 
         requried:true
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

serviceAcceptanceSchema.index({ serviceRequestId: 1, providerId: 1 }, { unique: true });

const serviceAcceptanceModal = mongoose.model("serviceAcceptance" , serviceAcceptanceSchema);

// Programmatically drop old unique index on serviceRequestId if it exists
serviceAcceptanceModal.collection.dropIndex("serviceRequestId_1").catch((err) => {
    // Silently ignore if index does not exist
});

export default serviceAcceptanceModal;