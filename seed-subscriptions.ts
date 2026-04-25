import mongoose from "mongoose";
import dotenv from "dotenv";
import PartnerSubscriptionPlan from "./src/modules/PartnerSubscription/plan.model.ts";

dotenv.config();

const plans = [
    // DOCTOR PLANS
    {
        name: "Doctor Basic",
        category: "doctor",
        price: 0,
        validityDays: 3650,
        commissionPercentage: 25,
        tier: "Basic",
        features: ["Standard visibility", "Weekly payouts", "Standard analytics"],
        isActive: true
    },
    {
        name: "Doctor Standard",
        category: "doctor",
        price: 1999,
        validityDays: 30,
        commissionPercentage: 15,
        tier: "Standard",
        features: ["Higher search visibility", "Priority in nearby listings", "Basic analytics dashboard", "Faster payout (3-4 days)", "Featured badge"],
        isActive: true
    },
    {
        name: "Doctor Premium",
        category: "doctor",
        price: 4999,
        validityDays: 30,
        commissionPercentage: 8,
        tier: "Premium",
        features: ["Top 3 listing placement", "Featured on homepage", "Instant payouts (24 hrs)", "Verified badge", "Profile highlight glow", "Advanced analytics"],
        isActive: true
    },
    // NURSE PLANS
    {
        name: "Nurse Basic",
        category: "nurse",
        price: 0,
        validityDays: 3650,
        commissionPercentage: 20,
        tier: "Basic",
        features: ["Standard visibility", "Weekly payouts"],
        isActive: true
    },
    {
        name: "Nurse Standard",
        category: "nurse",
        price: 1499,
        validityDays: 30,
        commissionPercentage: 12,
        tier: "Standard",
        features: ["Higher search visibility", "Faster payout (3-4 days)", "Featured badge"],
        isActive: true
    },
    {
        name: "Nurse Premium",
        category: "nurse",
        price: 3999,
        validityDays: 30,
        commissionPercentage: 8,
        tier: "Premium",
        features: ["Top 3 listing placement", "Instant payouts (24 hrs)", "Verified badge", "Advanced analytics"],
        isActive: true
    },
    // LAB PLANS
    {
        name: "Lab Basic",
        category: "lab",
        price: 0,
        validityDays: 3650,
        commissionPercentage: 18,
        tier: "Basic",
        features: ["Standard volume ranking", "Weekly payouts"],
        isActive: true
    },
    {
        name: "Lab Standard",
        category: "lab",
        price: 2499,
        validityDays: 30,
        commissionPercentage: 12,
        tier: "Standard",
        features: ["Priority ranking", "Faster payouts", "Volume insights"],
        isActive: true
    },
    {
        name: "Lab Premium",
        category: "lab",
        price: 5999,
        validityDays: 30,
        commissionPercentage: 7,
        tier: "Premium",
        features: ["Top ranking", "Ad placement", "Instant payouts", "Advanced volume analytics"],
        isActive: true
    },
    // AMBULANCE PLANS
    {
        name: "Ambulance Basic",
        category: "ambulance",
        price: 0,
        validityDays: 3650,
        commissionPercentage: 15,
        tier: "Basic",
        features: ["Standard response visibility", "Weekly payouts"],
        isActive: true
    },
    {
        name: "Ambulance Standard",
        category: "ambulance",
        price: 1899,
        validityDays: 30,
        commissionPercentage: 10,
        tier: "Standard",
        features: ["Priority response radius", "Faster payouts"],
        isActive: true
    },
    {
        name: "Ambulance Premium",
        category: "ambulance",
        price: 4499,
        validityDays: 30,
        commissionPercentage: 6,
        tier: "Premium",
        features: ["Instant response priority", "Top listing", "Instant payouts"],
        isActive: true
    },
    // VENDOR PLANS
    {
        name: "Vendor Basic",
        category: "rental",
        price: 0,
        validityDays: 3650,
        commissionPercentage: 20,
        tier: "Basic",
        features: ["Standard catalog visibility", "Weekly payouts"],
        isActive: true
    },
    {
        name: "Vendor Standard",
        category: "rental",
        price: 2199,
        validityDays: 30,
        commissionPercentage: 15,
        tier: "Standard",
        features: ["Priority catalog placement", "Faster payouts", "Inventory insights"],
        isActive: true
    },
    {
        name: "Vendor Premium",
        category: "rental",
        price: 5499,
        validityDays: 30,
        commissionPercentage: 8,
        tier: "Premium",
        features: ["Homepage features", "Top search listing", "Instant payouts", "Advanced demand analytics"],
        isActive: true
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/a1care");
        console.log("Connected to MongoDB for complete seeding...");

        await PartnerSubscriptionPlan.deleteMany({});
        await PartnerSubscriptionPlan.insertMany(plans);

        console.log("Successfully seeded ALL category subscription plans!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
