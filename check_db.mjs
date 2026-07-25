import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    console.log('Connected to DB');
    const PartnerSubscription = mongoose.connection.collection('partnersubscriptions');
    const subs = await PartnerSubscription.find({}).toArray();
    console.log('Total subscriptions:', subs.length);
    if(subs.length > 0) {
        console.log(subs.slice(-2));
    }
    
    const PartnerSubscriptionPlan = mongoose.connection.collection('partnersubscriptionplans');
    const plans = await PartnerSubscriptionPlan.find({}).toArray();
    console.log('Total plans:', plans.length);
    if(plans.length > 0) {
        console.log(plans.slice(-2));
    }
    process.exit(0);
});
