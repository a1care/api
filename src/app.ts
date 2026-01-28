import express from 'express'
import cors from 'cors'
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./utils/ApiError.js";
import { errorHandler } from './utils/errorHandler.js';
import PatientAuth from './modules/Authentication/patient.routes.js'
import ServiceRoute from './modules/Services/services.routes.js'
import SuberServiceRoutes from './modules/Services/subService.routes.js'
import childServiceRoute from './modules/Services/childService.routes.js'
import roleRoutes from './modules/roles/role.routes.js'
import doctorRoutes from './modules/Doctors/doctor.routes.js'
import doctorAppointmentRoutes from './modules/Bookings/doctorAppointment.routes.js'
import serviceBookingRoutes from './modules/Bookings/service/serviceBooking.routes.js'
import addressRoutes from './modules/Address/address.routes.js'
const PORT = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes 
//authentication

app.use('/api/patient/auth', PatientAuth);

//services
app.use('/api/services' , ServiceRoute)
app.use('/api/subservice' , SuberServiceRoutes)
app.use('/api/childService' , childServiceRoute)

//roles 
app.use("/api/role" , roleRoutes)

//doctors
app.use('/api/doctor' , doctorRoutes)

//address
app.use('/api/patient/address' , addressRoutes)
//bookings
app.use('/api/appointment' ,doctorAppointmentRoutes )
app.use('/api/service/booking' , serviceBookingRoutes)

//error catching
app.use(errorHandler);

export default app
