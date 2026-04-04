const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env'});

const Schema = mongoose.Schema;

async function runTest() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const Patient = mongoose.model('Patient', new Schema({}, {strict: false}), 'patients');
    const patient = await Patient.findOne();

    if (!patient) {
        console.log("No patient found");
        process.exit(1);
    }

    const token = jwt.sign(
        { userId: patient._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
    console.log("GEN_TOKEN:" + token);

    const ChildService = mongoose.model('ChildService', new Schema({}, {strict: false}), 'childservices');
    const service = await ChildService.findOne();
    console.log("SERVICE_ID:" + (service ? service._id : "None"));

    process.exit(0);
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
