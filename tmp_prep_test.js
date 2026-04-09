const mongoose = require('mongoose');
require('dotenv').config({path: 'c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env'});

const Schema = mongoose.Schema;

async function runTest() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const Doctor = mongoose.model('Doctor', new Schema({}, {strict: false}), 'doctors');
    const ChildService = mongoose.model('ChildService', new Schema({}, {strict: false}), 'childservices');
    const Patient = mongoose.model('Patient', new Schema({}, {strict: false}), 'patients');

    const doctor = await Doctor.findOne({ fcmToken: { $exists: true, $ne: null } });
    const service = await ChildService.findOne();
    const patient = await Patient.findOne();

    if (!doctor || !service || !patient) {
        console.log({
            doctor: !!doctor,
            service: !!service,
            patient: !!patient
        });
        process.exit(1);
    }

    console.log("Found required entities:");
    console.log("PATIENT_ID:", patient._id);
    console.log("SERVICE_ID:", service._id);
    console.log("PARTNER_ID:", doctor._id);
    console.log("PARTNER_FCM:", doctor.fcmToken);
    console.log("PARTNER_ROLES:", JSON.stringify(doctor.roleId));
    console.log("SERVICE_ROLES:", JSON.stringify(service.allowedRoleIds));

    // To ensure the broadcast works, the partner must have the role allowed for the service
    // and be in "Active" status.
    await Doctor.findByIdAndUpdate(doctor._id, {
        status: 'Active',
        roleId: service.allowedRoleIds[0], // force match for testing
    });
    console.log("Ensured partner is Active and matches role");

    // Also need a valid subscription in many cases (as seen in serviceBroadcast.ts)
    const Subscription = mongoose.model('PartnerSubscription', new Schema({}, {strict: false}), 'partnersubscriptions');
    await Subscription.findOneAndUpdate(
        { partnerId: doctor._id },
        { 
            partnerId: doctor._id,
            status: 'Active',
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days from now
        },
        { upsert: true }
    );
    console.log("Ensured partner has Active subscription");

    process.exit(0);
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
