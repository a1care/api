import express from 'express'
import { uploadServiceAssets } from '../../middlewares/upload.js'
import { attachServiceAssetsUrl } from '../../middlewares/attachServiceAssets.js'
import { createService, deleteService, getServices, updateService } from './services.controller.js'

const router = express.Router()

router.get('/', getServices)
router.post("/create", uploadServiceAssets, attachServiceAssetsUrl, createService)
router.put("/:id", uploadServiceAssets, attachServiceAssetsUrl, updateService)
router.delete('/:id', deleteService)

export default router
