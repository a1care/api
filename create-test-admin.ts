import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDb } from "./src/configs/db.js";
import { Admin } from "./src/modules/Admin/admin.model.js";

async function createNewAdmin() {
  const email = "testadmin@a1care.com";
  const password = "admin123";

  try {
    await connectDb();
    const existing = await Admin.findOne({ email });
    if (existing) {
        await Admin.deleteOne({ email });
        console.log(`🧹 Cleared old ${email}`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({
        name: "Test Admin",
        email,
        passwordHash,
        role: "super_admin",
        isActive: true
    });
    console.log(`✅ Success: New admin "${email}" created with password "admin123"`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
}

createNewAdmin();
