import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDb } from "../../configs/db.js";
import { Admin } from "./admin.model.js";

async function seedSuperAdmin() {
  console.log("🚀 Starting Super Admin seeding process...");

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? "A1Care Super Admin";

  if (!email || !password) {
    console.error("❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required in .env");
    process.exit(1);
  }

  try {
    await connectDb();

    // Check if DB is actually connected (connectDb doesn't throw if dev)
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database connection not established. Seeding aborted.");
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await Admin.findOne({ email: normalizedEmail });

    if (existing) {
      console.log(`ℹ️  Super admin with email "${normalizedEmail}" already exists. skipping...`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await Admin.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: "super_admin"
      });
      console.log(`✅ Success: Super admin created with email "${normalizedEmail}"`);
    }

    console.log("🏁 Seeding process complete.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed to seed super admin:", err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedSuperAdmin();
