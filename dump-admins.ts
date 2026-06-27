import mongoose from "mongoose";

const URIs = [
  "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.sluef25.mongodb.net/a1care?retryWrites=true&w=majority",
  "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority"
];

async function dumpAdmins() {
  for (const uri of URIs) {
    console.log(`Connecting to: ${uri.split("@")[1].split("/")[0]}...`);
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected! Fetching admins...");
      
      const adminSchema = new mongoose.Schema({}, { strict: false });
      const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema, "admins");
      
      const admins = await Admin.find({});
      console.log(`Found ${admins.length} admins:`);
      admins.forEach(admin => {
        console.log(JSON.stringify(admin.toObject(), null, 2));
      });
      
      await mongoose.disconnect();
      console.log("Disconnected.");
    } catch (err: any) {
      console.error(`Error connecting to ${uri.split("@")[1].split("/")[0]}:`, err.message);
    }
    console.log("-----------------------------------------");
  }
  process.exit(0);
}

dumpAdmins();
