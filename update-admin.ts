import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDb } from "./src/configs/db.js";
import { Admin } from "./src/modules/Admin/admin.model.js";

async function updateAdmin() {
  const email = "newadmin@a1care.com";
  const password = "admin123";

  try {
    await connectDb();
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await Admin.findOneAndUpdate(
        { email },
        { passwordHash },
        { new: true }
    );
    if (updated) {
        console.log(`✅ Success: Password for "${email}" updated to "admin123"`);
    } else {
        console.log(`❌ Error: Admin with email "${email}" not found.`);
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
}

updateAdmin();
