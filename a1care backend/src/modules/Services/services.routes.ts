import express from 'express'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'
import { createService, deleteService, getServices, updateService } from './services.controller.js'

const router = express.Router()

router.get('/', getServices)
router.post("/create", uploadServiceImage, attachFileUrl, createService)
router.put('/:id', uploadServiceImage, attachFileUrl, updateService)
router.delete('/:id', deleteService)

export default router