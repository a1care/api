const mongoose = require("mongoose");
require("dotenv").config({ path: "c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env" });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Doctor = mongoose.model("Doctor", new mongoose.Schema({}, { strict: false }), "doctors");
  // Find doctors with an fcmToken
  const activePartners = await Doctor.find({ fcmToken: { $exists: true, $ne: null } }).select("mobileNumber fcmToken").sort({ updatedAt: -1 }).limit(10);
  
  console.log("RECENT ACTIVE PARTNERS WITH FCM:");
  console.log(JSON.stringify(activePartners, null, 2));

  process.exit(0);
}
run();
