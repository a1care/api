import express from 'express'
import { uploadServiceImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'
import { createService, deleteService, getServices } from './services.controller.js'

const router = express.Router()

router.get('/' , getServices)
router.post("/create" , uploadServiceImage , attachFileUrl , createService)
router.delete('/delete/:id' , deleteService)

export default router