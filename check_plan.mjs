import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    const PartnerSubscriptionPlan = mongoose.connection.collection('partnersubscriptionplans');
    const plan = await PartnerSubscriptionPlan.findOne({_id: new mongoose.Types.ObjectId('6a5ae513658019da340b4a1f')});
    console.log('Plan:', plan);
    process.exit(0);
});
