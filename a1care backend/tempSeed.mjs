import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const AdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Admin = mongoose.model('Admin', AdminSchema);

const email = 'admin@a1care.com';
const password = 'admin123';
const MONGO_URI = 'mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.sluef25.mongodb.net/a1care?retryWrites=true&w=majority';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash(password, 10);
    const existing = await Admin.findOne({ email });

    if (existing) {
      existing.name = 'A1Care Admin';
      existing.passwordHash = hashedPassword;
      existing.role = 'super_admin';
      await existing.save();
      console.log('Admin already exists. Updated password to admin123 and role to super_admin');
    } else {
      await Admin.create({
        name: 'A1Care Admin',
        email,
        passwordHash: hashedPassword,
        role: 'super_admin'
      });
      console.log('New Super Admin created!');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
