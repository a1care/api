import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri as string).then(async () => {
    console.log("Connected to MongoDB");
    const doctorModel = mongoose.connection.collection("doctors");
    const testDoc = await doctorModel.findOne({ mobileNumber: { $in: ["8309470360", "+918309470360"] } });
    console.log("Test Doctor Status:", testDoc ? {
        id: testDoc._id,
        isRegistered: testDoc.isRegistered,
        status: testDoc.status,
        name: testDoc.name
    } : "Not found");
    
    if (testDoc) {
        const subModel = mongoose.connection.collection("partnersubscriptions");
        const sub = await subModel.findOne({ partnerId: testDoc._id });
        console.log("Subscription:", sub ? {
            status: sub.status,
            endDate: sub.endDate
        } : "No subscription");
    }
    
    process.exit(0);
}).catch(console.error);
