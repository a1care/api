const mongoose = require('mongoose');
require('dotenv').config({path: 'c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env'});

const Schema = mongoose.Schema;

async function runTest() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const Doctor = mongoose.model('Doctor', new Schema({}, {strict: false}), 'doctors');
    const ChildService = mongoose.model('ChildService', new Schema({}, {strict: false}), 'childservices');
    
    const service = await ChildService.findOne();
    const doctor = await Doctor.findOne();

    if (!doctor || !service) {
        console.log("Missing entities");
        process.exit(1);
    }

    const dummyFCM = "DUMMY_FCM_TOKEN_" + Date.now();
    const allowedRole = service.allowedRoleIds ? service.allowedRoleIds[0] : null;

    await Doctor.findByIdAndUpdate(doctor._id, {
        status: 'Active',
        roleId: allowedRole,
        fcmToken: dummyFCM,
        serviceRadius: 1000, // Large radius
    });
    console.log("Updated Doctor " + doctor._id + " with Role " + allowedRole + " and FCM " + dummyFCM);

    const Subscription = mongoose.model('PartnerSubscription', new Schema({}, {strict: false}), 'partnersubscriptions');
    await Subscription.findOneAndUpdate(
        { partnerId: doctor._id },
        { 
            partnerId: doctor._id,
            status: 'Active',
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300)
        },
        { upsert: true }
    );
    console.log("Ensured Subscription for " + doctor._id);

    const LocationModel = mongoose.model('Location', new Schema({}, {strict: false}), 'locations');
    await LocationModel.findOneAndUpdate(
        { userId: doctor._id },
        { 
            userId: doctor._id,
            latitude: 17.3850,
            longitude: 78.4867
        },
        { upsert: true }
    );
    console.log("Ensured Location for " + doctor._id);

    process.exit(0);
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
