const mongoose = require("mongoose");
require("dotenv").config({ path: "c:/Users/SAI DIHNESH/Desktop/Reddy/api/a1care backend/.env" });
const Schema = mongoose.Schema;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const ChildService = mongoose.model("ChildService", new Schema({}, { strict: false }), "childservices");
  const services = await ChildService.find({ name: /Dermatologist/i });
  if (services.length > 0) {
    console.log("FOUND_SERVICE:", services[0]._id.toString());
  } else {
    console.log("SERVICE_NOT_FOUND");
  }
  process.exit(0);
}
run();
