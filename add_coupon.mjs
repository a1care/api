import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["PERCENTAGE", "FLAT"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 0 },
    usagePerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },
    applicableTo: { type: String, enum: ["ALL", "SERVICE", "DOCTOR"], default: "ALL" },
});

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const code = "WELCOME50";
        // Check if exists
        const existing = await Coupon.findOne({ code });
        if (existing) {
            console.log("Coupon already exists!");
        } else {
            const c = new Coupon({
                code: "WELCOME50",
                description: "Get 50% off on your first booking up to ₹200!",
                discountType: "PERCENTAGE",
                discountValue: 50,
                maxDiscountAmount: 200,
                minOrderAmount: 100,
                isActive: true
            });
            await c.save();
            console.log("Coupon WELCOME50 added successfully!");
        }
        
        const code2 = "FLAT100";
        const existing2 = await Coupon.findOne({ code: code2 });
        if (!existing2) {
            const c2 = new Coupon({
                code: "FLAT100",
                description: "Get flat ₹100 off on orders above ₹500",
                discountType: "FLAT",
                discountValue: 100,
                maxDiscountAmount: 0,
                minOrderAmount: 500,
                isActive: true
            });
            await c2.save();
            console.log("Coupon FLAT100 added successfully!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
