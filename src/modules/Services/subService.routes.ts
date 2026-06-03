import express from 'express'
import { createSubService, getServicesByServiceId, deleteSubService, updateSubService } from './subService.controller.js'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js'

const router = express.Router()

const adminWrite = [protectAdmin, requireAdminRole(["admin", "super_admin"])]

router.get('/:serviceId', getServicesByServiceId)
router.post('/create/:serviceId', ...adminWrite, uploadServiceImage, attachFileUrl, createSubService)
router.put('/:id', ...adminWrite, uploadServiceImage, attachFileUrl, updateSubService)
router.delete('/:id', protectAdmin, requireAdminRole(["super_admin"]), deleteSubService)
export default router 
