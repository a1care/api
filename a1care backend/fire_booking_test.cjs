const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env' });
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;

function httpPost(url, body, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const Patient = mongoose.model('Patient', new Schema({}, { strict: false }), 'patients');
    const Doctor = mongoose.model('Doctor', new Schema({}, { strict: false }), 'doctors');
    const ChildService = mongoose.model('ChildService', new Schema({}, { strict: false }), 'childservices');

    // Find a patient
    const patient = await Patient.findOne({});
    if (!patient) { console.log("No patient found"); process.exit(1); }
    console.log("Patient:", patient._id, patient.name || patient.mobileNumber);

    // Find a service
    const service = await ChildService.findOne({ allowedRoleIds: { $exists: true, $not: { $size: 0 } } });
    if (!service) { console.log("No service found"); process.exit(1); }
    console.log("Service:", service._id, service.name);

    // Find partners with FCM tokens
    const partners = await Doctor.find({ fcmToken: { $exists: true, $ne: null }, status: 'Active' });
    console.log(`Partners with FCM tokens: ${partners.length}`);
    partners.forEach(p => console.log(` - ${p.name || p.mobileNumber} | FCM: ${p.fcmToken?.slice(0, 30)}...`));

    // Generate patient JWT
    const token = jwt.sign({ userId: patient._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log("\nFiring booking to production...");

    // Hit production booking API
    const result = await httpPost(
        'https://api.a1carehospital.in/api/service/booking/create',
        {
            childServiceId: String(service._id),
            paymentMode: 'OFFLINE',
            location: { lat: 17.3850, lng: 78.4867 },
            scheduledSlot: {
                startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
                endTime: new Date(Date.now() + 7200 * 1000).toISOString()
            }
        },
        { Authorization: `Bearer ${token}` }
    );

    console.log("\n===== BOOKING RESULT =====");
    console.log("Status:", result.status);
    console.log("Message:", result.body.message);
    console.log("Booking ID:", result.body.data?._id);
    console.log("==================");
    console.log("Notifications should now be sent to", partners.length, "partner(s)!");

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
