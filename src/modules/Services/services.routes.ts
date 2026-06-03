import express from 'express'
import { uploadServiceAssets } from '../../middlewares/upload.js'
import { attachServiceAssetsUrl } from '../../middlewares/attachServiceAssets.js'
import { createService, deleteService, getServices, updateService, reorderServices } from './services.controller.js'
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js'

const router = express.Router()

const adminWrite = [protectAdmin, requireAdminRole(["admin", "super_admin"])]

router.get('/', getServices)
router.post("/reorder", ...adminWrite, reorderServices)
router.post("/create", ...adminWrite, uploadServiceAssets, attachServiceAssetsUrl, createService)
router.put("/:id", ...adminWrite, uploadServiceAssets, attachServiceAssetsUrl, updateService)
router.delete('/:id', protectAdmin, requireAdminRole(["super_admin"]), deleteService)

export default router
