import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    const PartnerSubscription = mongoose.connection.collection('partnersubscriptions');
    const PartnerSubscriptionPlan = mongoose.connection.collection('partnersubscriptionplans');
    
    // Find subscriptions where planId doesn't exist in plans collection
    const subs = await PartnerSubscription.find({status: 'Active'}).toArray();
    for(let sub of subs) {
        const plan = await PartnerSubscriptionPlan.findOne({_id: sub.planId});
        if(!plan) {
            console.log('Subscription with missing plan:', sub._id, sub.partnerId, sub.planId);
        }
    }
    process.exit(0);
});
