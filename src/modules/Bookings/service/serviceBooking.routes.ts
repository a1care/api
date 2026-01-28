import express from 'express'
import { createServiceRequest, getPendingRequest, getSerivceRequestById, getServiceRequestByUser } from './serviceRequest.controller.js'
import { protect } from '../../../middlewares/protect.js'
import { createServiceAcceptance } from './serviceAcceptance.controller.js'
const router = express.Router()

//create service request
router.post("/create/",protect, createServiceRequest)

// create service acceptance 
router.post('/accept/:serviceRequestId/:providerId' ,createServiceAcceptance)

//update services status

//get requested services by userId
router.get('/user' ,protect , getServiceRequestByUser )
router.get("/pending" , protect , getPendingRequest)
router.get("/request/:requestId", protect , getSerivceRequestById)

//get accepted services by provider id


export default router