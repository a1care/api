import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { HealthPackageModel } from "./healthPackage.model.js";

// ── Public: Get all active packages ──
export const getHealthPackages = asyncHandler(async (req, res) => {
    const packages = await HealthPackageModel.find({ isActive: true })
        .sort({ isFeatured: -1, order: 1, createdAt: -1 });
    return res.json(new ApiResponse(200, "Health packages fetched", packages));
});

// ── Admin: Get ALL packages (including inactive) ──
export const getAllHealthPackagesAdmin = asyncHandler(async (req, res) => {
    const packages = await HealthPackageModel.find()
        .sort({ order: 1, createdAt: -1 });
    return res.json(new ApiResponse(200, "All health packages", packages));
});

// ── Admin: Create a package ──
export const createHealthPackage = asyncHandler(async (req, res) => {
    const {
        name, description, price, originalPrice,
        badge, color, testsIncluded, validityDays, order
    } = req.body;

    if (!name || !description || !price || !originalPrice) {
        throw new ApiError(400, "name, description, price, and originalPrice are required");
    }

    const pkg = new HealthPackageModel({
        name,
        description,
        price: Number(price),
        originalPrice: Number(originalPrice),
        imageUrl: (req as any).fileUrl,
        badge,
        color: color || "#2F80ED",
        testsIncluded: Array.isArray(testsIncluded)
            ? testsIncluded
            : typeof testsIncluded === "string"
                ? testsIncluded.split(",").map((t: string) => t.trim()).filter(Boolean)
                : [],
        validityDays: validityDays ? Number(validityDays) : 30,
        order: order ? Number(order) : 0,
    });

    await pkg.save();
    return res.status(201).json(new ApiResponse(201, "Health package created", pkg));
});

// ── Admin: Update a package ──
export const updateHealthPackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw new ApiError(400, "Package id is required");

    const update: any = { ...req.body };
    if (update.price) update.price = Number(update.price);
    if (update.originalPrice) update.originalPrice = Number(update.originalPrice);
    if (update.validityDays) update.validityDays = Number(update.validityDays);
    if (update.order) update.order = Number(update.order);
    if ((req as any).fileUrl) update.imageUrl = (req as any).fileUrl;
    if (update.testsIncluded && typeof update.testsIncluded === "string") {
        update.testsIncluded = update.testsIncluded.split(",").map((t: string) => t.trim()).filter(Boolean);
    }

    const pkg = await HealthPackageModel.findByIdAndUpdate(id, update, { new: true });
    if (!pkg) throw new ApiError(404, "Health package not found");

    return res.json(new ApiResponse(200, "Health package updated", pkg));
});

// ── Admin: Delete a package ──
export const deleteHealthPackage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pkg = await HealthPackageModel.findByIdAndDelete(id);
    if (!pkg) throw new ApiError(404, "Health package not found");
    return res.json(new ApiResponse(200, "Health package deleted", pkg));
});

// ── Admin: Toggle active/inactive ──
export const toggleHealthPackageActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pkg = await HealthPackageModel.findById(id);
    if (!pkg) throw new ApiError(404, "Health package not found");
    pkg.isActive = !pkg.isActive;
    await pkg.save();
    return res.json(new ApiResponse(200, `Package ${pkg.isActive ? "activated" : "deactivated"}`, pkg));
});

// ── Admin: Toggle featured ──
export const toggleHealthPackageFeatured = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pkg = await HealthPackageModel.findById(id);
    if (!pkg) throw new ApiError(404, "Health package not found");
    pkg.isFeatured = !pkg.isFeatured;
    await pkg.save();
    return res.json(new ApiResponse(200, `Package ${pkg.isFeatured ? "featured" : "unfeatured"}`, pkg));
});

// ── Admin: Seed default packages ──
export const seedHealthPackages = asyncHandler(async (req, res) => {
    const count = await HealthPackageModel.countDocuments();
    if (count > 0) {
        return res.json(new ApiResponse(200, `Seed skipped — ${count} packages already exist`, []));
    }

    const seeds = [
        {
            name: "Basic Health Checkup",
            description: "Essential screening for a healthy lifestyle. Ideal for annual checkups.",
            price: 999,
            originalPrice: 1499,
            badge: "BEST VALUE",
            color: "#2F80ED",
            testsIncluded: ["Complete Blood Count (CBC)", "Blood Sugar (Fasting)", "Urine Routine Analysis", "Cholesterol Panel", "ECG"],
            validityDays: 30,
            order: 1,
            isFeatured: true,
        },
        {
            name: "Diabetes Care Pack",
            description: "Comprehensive diabetes monitoring with kidney and liver function tests.",
            price: 1499,
            originalPrice: 2200,
            badge: "POPULAR",
            color: "#9B51E0",
            testsIncluded: ["HbA1c", "Fasting Blood Glucose", "Post-Prandial Blood Glucose", "Kidney Function Test", "Lipid Profile", "Urine Microalbumin"],
            validityDays: 30,
            order: 2,
            isFeatured: true,
        },
        {
            name: "Women's Wellness Pack",
            description: "Tailored health screening for women covering hormonal and nutritional markers.",
            price: 1799,
            originalPrice: 2800,
            badge: "NEW",
            color: "#D63384",
            testsIncluded: ["Hemoglobin", "Thyroid Profile (T3, T4, TSH)", "Vitamin D", "Vitamin B12", "Pap Smear", "Breast Ultrasound", "Iron Studies"],
            validityDays: 30,
            order: 3,
        },
        {
            name: "Cardiac Health Package",
            description: "Heart health screening with advanced cardiac biomarkers.",
            price: 2499,
            originalPrice: 3500,
            badge: "RECOMMENDED",
            color: "#EB5757",
            testsIncluded: ["Lipid Profile", "ECG", "Echo (if required)", "hs-CRP", "Troponin I", "Blood Pressure Monitoring", "Blood Sugar"],
            validityDays: 30,
            order: 4,
        },
        {
            name: "Senior Citizen Full Body",
            description: "Complete health assessment for adults above 55 years. Covers all critical systems.",
            price: 2999,
            originalPrice: 4500,
            badge: "COMPREHENSIVE",
            color: "#F2994A",
            testsIncluded: ["Complete Blood Count", "Kidney Function", "Liver Function", "Blood Sugar", "Lipid Profile", "Thyroid Profile", "Vitamin D & B12", "Bone Density Scan", "Chest X-Ray", "ECG"],
            validityDays: 60,
            order: 5,
            isFeatured: true,
        },
        {
            name: "Thyroid & Hormonal Check",
            description: "Detect thyroid imbalances and hormonal disorders early.",
            price: 899,
            originalPrice: 1200,
            color: "#27AE60",
            testsIncluded: ["TSH", "Free T3", "Free T4", "Anti-TPO Antibodies", "FSH", "LH", "Prolactin"],
            validityDays: 30,
            order: 6,
        },
    ];

    const created = await HealthPackageModel.insertMany(seeds);
    return res.status(201).json(new ApiResponse(201, `Seeded ${created.length} health packages`, created));
});
