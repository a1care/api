const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env' });

const Schema = mongoose.Schema;

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const Doctor = mongoose.model('Doctor', new Schema({}, { strict: false }), 'doctors');
    const Subscription = mongoose.model('PartnerSubscription', new Schema({}, { strict: false }), 'partnersubscriptions');

    // Find all doctors with real FCM tokens (not dummy)
    const doctors = await Doctor.find({ fcmToken: { $exists: true, $ne: null } });
    console.log(`\n--- All Partners with FCM Tokens (${doctors.length}) ---`);
    doctors.forEach(d => {
        const isReal = !d.fcmToken?.startsWith('DUMMY');
        console.log(`${isReal ? '✅' : '❌'} ${d.name || d.mobileNumber} | ${d._id} | FCM: ${d.fcmToken?.slice(0, 40)}...`);
    });

    // Find all subscriptions
    const subs = await Subscription.find({}).sort({ createdAt: -1 });
    console.log(`\n--- Current Subscriptions (${subs.length}) ---`);
    subs.forEach(s => {
        const expired = new Date(s.endDate) < new Date();
        console.log(`${expired ? '❌ EXPIRED' : '✅ ACTIVE'} | Partner: ${s.partnerId} | Status: ${s.status} | End: ${s.endDate}`);
    });

    // Reactivate ALL expired subscriptions
    const now = new Date();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const result = await Subscription.updateMany(
        { $or: [{ endDate: { $lt: now } }, { status: { $ne: 'Active' } }] },
        { $set: { status: 'Active', endDate: futureDate } }
    );
    console.log(`\n✅ Reactivated ${result.modifiedCount} subscription(s) for 1 year`);

    // Also ensure all registered doctors have a subscription
    const allDoctors = await Doctor.find({ isRegistered: true });
    let created = 0;
    for (const doc of allDoctors) {
        const hasSub = await Subscription.findOne({ partnerId: doc._id });
        if (!hasSub) {
            await Subscription.create({
                partnerId: doc._id,
                status: 'Active',
                endDate: futureDate,
                planName: 'Default'
            });
            created++;
            console.log(`Created subscription for: ${doc.name || doc.mobileNumber}`);
        }
    }
    if (created > 0) console.log(`Created ${created} new subscriptions`);

    // Check wallet/earnings data for all partners
    const ServiceRequest = mongoose.model('ServiceRequest', new Schema({}, { strict: false }), 'servicerequests');
    const DoctorAppt = mongoose.model('DoctorAppointment', new Schema({}, { strict: false }), 'doctorappointments');

    console.log('\n--- Earnings Data Check ---');
    for (const doc of allDoctors.slice(0, 5)) {
        const completedServices = await ServiceRequest.countDocuments({ assignedProviderId: doc._id, status: 'COMPLETED' });
        const completedAppts = await DoctorAppt.countDocuments({ doctorId: doc._id, status: 'Completed' });
        console.log(`${doc.name || doc.mobileNumber}: ${completedServices} services, ${completedAppts} appointments completed`);
    }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
