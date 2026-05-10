import express from 'express'
import { 
    addRolesToChildService, 
    createChildService, 
    getChildServiceBySubserviceId, 
    getChildServiceById, 
    deleteChildService,
    getFeaturedChildServices,
    toggleFeaturedChildService,
    updateChildService
} from './childService.controller.js'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'

const router = express.Router()

router.get('/featured', getFeaturedChildServices)
router.post('/create/:serviceId/:subServiceId', uploadServiceImage, attachFileUrl, createChildService)
router.get('/detail/:id', getChildServiceById)
router.put("/addroles/:childServiceId", addRolesToChildService)
router.put("/:id", uploadServiceImage, attachFileUrl, updateChildService)
router.delete("/:id", deleteChildService)
router.patch("/featured/toggle/:id", toggleFeaturedChildService)
router.get('/:subServiceId', getChildServiceBySubserviceId)


export default router
