import express from "express";
import {
    getHealthPackages,
    getAllHealthPackagesAdmin,
    createHealthPackage,
    updateHealthPackage,
    deleteHealthPackage,
    getHealthPackageById,
    toggleHealthPackageActive,
    toggleHealthPackageFeatured,
    seedHealthPackages,
} from "./healthPackage.controller.js";
import { protectAdmin, requireAdminRole } from "../../middlewares/protectAdmin.js";

const router = express.Router();

// Public
router.get("/", getHealthPackages);
router.get("/detail/:id", getHealthPackageById);

// Admin — previously unprotected; the /admin/ prefix was cosmetic only.
const adminOnly = [protectAdmin, requireAdminRole(["admin", "super_admin"])];
router.get("/admin/all", ...adminOnly, getAllHealthPackagesAdmin);
router.post("/admin/create", ...adminOnly, createHealthPackage);
router.put("/admin/update/:id", ...adminOnly, updateHealthPackage);
router.delete("/admin/delete/:id", ...adminOnly, deleteHealthPackage);
router.patch("/admin/toggle-active/:id", ...adminOnly, toggleHealthPackageActive);
router.patch("/admin/toggle-featured/:id", ...adminOnly, toggleHealthPackageFeatured);
router.post("/admin/seed", protectAdmin, requireAdminRole(["super_admin"]), seedHealthPackages);

export default router;
