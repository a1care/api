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
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js'

const router = express.Router()

const adminWrite = [protectAdmin, requireAdminRole(["admin", "super_admin"])]

router.get('/featured', getFeaturedChildServices)
router.post('/create/:serviceId/:subServiceId', ...adminWrite, uploadServiceImage, attachFileUrl, createChildService)
router.get('/detail/:id', getChildServiceById)
router.put("/addroles/:childServiceId", ...adminWrite, addRolesToChildService)
router.put("/:id", ...adminWrite, uploadServiceImage, attachFileUrl, updateChildService)
router.delete("/:id", protectAdmin, requireAdminRole(["super_admin"]), deleteChildService)
router.patch("/featured/toggle/:id", ...adminWrite, toggleFeaturedChildService)
router.get('/:subServiceId', getChildServiceBySubserviceId)


export default router
