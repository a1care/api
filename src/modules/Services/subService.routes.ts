import express from 'express'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'
import { createSubService, getServicesByServiceId } from './subService.controller.js'
import { deleteService } from './services.controller.js'

const router = express.Router()

router.get('/:serviceId' , getServicesByServiceId)
router.post('/create/:serviceId' , uploadServiceImage , attachFileUrl , createSubService)
router.delete('/:id' , deleteService)
export default router 