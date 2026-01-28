import express from 'express'
import { createChildService, getChildServiceBySubserviceId } from './childService.controller.js'

const router = express.Router()

router.post('/create/:serviceId/:subServiceId' , createChildService)
router.get('/:subServiceId' , getChildServiceBySubserviceId)

export default router