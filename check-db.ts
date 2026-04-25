import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "./src/configs/db.js";
import { Admin } from "./src/modules/Admin/admin.model.js";

async function listAdmins() {
  try {
    await connectDb();
    const admins = await Admin.find({});
    console.log("Current Admins in DB:");
    admins.forEach(a => {
        console.log(`- ${a.email} [Role: ${a.role}, Active: ${a.isActive}]`);
    });
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
}

listAdmins();
