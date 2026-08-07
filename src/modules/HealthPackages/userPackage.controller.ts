import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { UserPackageModel } from "./userPackage.model.js";
import { HealthPackageModel } from "./healthPackage.model.js";
import mongoose from "mongoose";

/**
 * Gets all active packages for the logged-in user.
 * Optional query param `serviceType` can filter packages that cover a specific service.
 */
export const getMyActivePackages = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { serviceType } = req.query;

    // Build the query to find active packages for this user
    const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        status: "ACTIVE",
        remainingUses: { $gt: 0 },
        validityEndDate: { $gte: new Date() }
    };

    let userPackages = await UserPackageModel.find(query)
        .populate("packageId", "name description imageUrl badge color coveredServices testsIncluded")
        .sort({ createdAt: -1 })
        .lean();

    // If serviceType is provided (e.g. 'OP_TICKET'), filter the results
    if (serviceType) {
        userPackages = userPackages.filter((up: any) => {
            const healthPackage = up.packageId;
            if (!healthPackage) return false;
            
            // Check if coveredServices exists and includes the requested serviceType
            return healthPackage.coveredServices && 
                   healthPackage.coveredServices.includes(serviceType as string);
        });
    }

    return res.status(200).json(
        new ApiResponse(200, "Active packages fetched successfully", userPackages)
    );
});

/**
 * Purchases a HealthPackage and creates a PENDING UserPackage.
 * (It will be marked ACTIVE when payment completes).
 */
export const purchaseHealthPackage = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { healthPackageId, paymentMode } = req.body;
    if (!healthPackageId) throw new ApiError(400, "healthPackageId is required");

    const healthPkg = await HealthPackageModel.findById(healthPackageId);
    if (!healthPkg) throw new ApiError(404, "Health package not found");
    if (!healthPkg.isActive) throw new ApiError(400, "This health package is no longer active");

    const validityEndDate = new Date();
    validityEndDate.setDate(validityEndDate.getDate() + healthPkg.validityDays);

    const userPkg = new UserPackageModel({
        userId: new mongoose.Types.ObjectId(userId),
        packageId: healthPkg._id,
        status: paymentMode === "OFFLINE" ? "ACTIVE" : "PENDING",
        totalUses: healthPkg.usageLimit || 1, // fallback to 1 if usageLimit is not on schema
        remainingUses: healthPkg.usageLimit || 1,
        validityStartDate: new Date(),
        validityEndDate: validityEndDate,
        purchasePrice: healthPkg.price,
    });

    // If WALLET, wallet deduction happens immediately in payment controller. 
    // Here we just create the record.

    await userPkg.save();

    return res.status(201).json(
        new ApiResponse(201, "Package purchase initiated", userPkg)
    );
});
