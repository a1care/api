import express from "express";
import {
    getHealthPackages,
    getAllHealthPackagesAdmin,
    createHealthPackage,
    updateHealthPackage,
    deleteHealthPackage,
    toggleHealthPackageActive,
    toggleHealthPackageFeatured,
    seedHealthPackages,
} from "./healthPackage.controller.js";

const router = express.Router();

// Public
router.get("/", getHealthPackages);

// Admin
router.get("/admin/all", getAllHealthPackagesAdmin);
router.post("/admin/create", createHealthPackage);
router.put("/admin/update/:id", updateHealthPackage);
router.delete("/admin/delete/:id", deleteHealthPackage);
router.patch("/admin/toggle-active/:id", toggleHealthPackageActive);
router.patch("/admin/toggle-featured/:id", toggleHealthPackageFeatured);
router.post("/admin/seed", seedHealthPackages);

export default router;
