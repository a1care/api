import express from 'express'
import { createServiceRequest, getPendingRequest, getSerivceRequestById, getServiceRequestByUser, getServiceRequestForProvider, updateServiceRequestStatus } from './serviceRequest.controller.js'
import { protect } from '../../../middlewares/protect.js'
import { createServiceAcceptance, createServiceRejected } from './serviceAcceptance.controller.js'
const router = express.Router()

//create service request
router.post("/create/", protect, createServiceRequest)

// create service acceptance 
router.post('/accept/:serviceRequestId', protect, createServiceAcceptance)
router.post('/reject/:serviceRequestId', protect, createServiceRejected)


//update services status
router.patch("/status/:id", protect, updateServiceRequestStatus)

//get requested services by userId
router.get('/user', protect, getServiceRequestByUser)
router.get("/get/pending", protect, getPendingRequest)
router.get("/request/:requestId", protect, getSerivceRequestById)

//get pending services by provider id
router.get('/provider/:roleId', protect, getServiceRequestForProvider)

export default router