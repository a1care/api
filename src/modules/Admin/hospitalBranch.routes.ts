import { Router, type Request, type Response } from "express";
import { HospitalBranch } from "./hospitalBranch.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";

const router = Router();

// Get all branches (Public or Admin)
router.get("/", asyncHandler(async (req: Request, res: Response) => {
    const branches = await HospitalBranch.find();
    return res.json(new ApiResponse(200, "Branches retrieved", branches));
}));

// Create branch
router.post("/", protectAdmin, requireAdminRole(["admin", "super_admin"]), asyncHandler(async (req: Request, res: Response) => {
    const { name, location, addressText, ambulanceRadiusKm, isActive } = req.body;
    if (!name || !location?.lat || !location?.lng) throw new ApiError(400, "Name and location (lat, lng) are required");
    
    const branch = await HospitalBranch.create({
        name, addressText, location, ambulanceRadiusKm: ambulanceRadiusKm || 5, isActive
    });
    return res.status(201).json(new ApiResponse(201, "Branch created", branch));
}));

// Update branch
router.put("/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), asyncHandler(async (req: Request, res: Response) => {
    const branch = await HospitalBranch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!branch) throw new ApiError(404, "Branch not found");
    return res.json(new ApiResponse(200, "Branch updated", branch));
}));

// Delete branch
router.delete("/:id", protectAdmin, requireAdminRole(["admin", "super_admin"]), asyncHandler(async (req: Request, res: Response) => {
    const branch = await HospitalBranch.findByIdAndDelete(req.params.id);
    if (!branch) throw new ApiError(404, "Branch not found");
    return res.json(new ApiResponse(200, "Branch deleted successfully", {}));
}));

export default router;
