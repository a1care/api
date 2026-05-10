import express from 'express'
import { createSubService, getServicesByServiceId, deleteSubService, updateSubService } from './subService.controller.js'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'

const router = express.Router()

router.get('/:serviceId', getServicesByServiceId)
router.post('/create/:serviceId', uploadServiceImage, attachFileUrl, createSubService)
router.put('/:id', uploadServiceImage, attachFileUrl, updateSubService)
router.delete('/:id', deleteSubService)
export default router 
