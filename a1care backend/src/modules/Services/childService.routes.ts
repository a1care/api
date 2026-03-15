import express from 'express'
import { addRolesToChildService, createChildService, getChildServiceBySubserviceId, getChildServiceById, deleteChildService } from './childService.controller.js'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'

const router = express.Router()

router.post('/create/:serviceId/:subServiceId', uploadServiceImage, attachFileUrl, createChildService)
router.get('/:subServiceId', getChildServiceBySubserviceId)
router.get('/detail/:id', getChildServiceById)
router.put("/addroles/:childServiceId", addRolesToChildService)
router.delete("/:id", deleteChildService)

export default router