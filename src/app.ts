import express from 'express'
import cors from 'cors'
import type { Request, Response, NextFunction } from "express";
import path from "path";
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
import adminRoutes from './modules/Admin/admin.routes.js'
import ticketRoutes from './modules/Tickets/ticket.routes.js'
import reviewRoutes from './modules/Reviews/review.routes.js'
import walletRoutes from './modules/Wallet/wallet.routes.js'
import partnerSubscriptionRoutes from './modules/PartnerSubscription/subscription.routes.js'
import chatRoutes from './modules/Chat/chat.routes.js'
import notificationRoutes from './modules/Notifications/notification.routes.js'
import medicalRecordRoutes from './modules/MedicalRecords/medicalRecord.routes.js'
import patientMedicalHistoryRoutes from './modules/MedicalRecords/patientMedicalHistory.routes.js'
import staffEarningsRoutes from './modules/Earnings/earnings.routes.js'
import paymentRoutes from './modules/Payments/payment.routes.js'
import agoraRoutes from './modules/Agora/agora.routes.js'
import healthPackageRoutes from './modules/HealthPackages/healthPackage.routes.js'
const PORT = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { readConfigStore } from "./modules/Admin/admin.controller.js";
const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Bypass for admin routes and health checks
    if (req.url.startsWith("/api/admin") || req.url === "/api/health" || req.url.startsWith("/api/common/config")) {
        return next();
    }

    try {
        const config = await readConfigStore();
        if (config.system?.maintenanceMode) {
            return res.status(503).json({
                success: false,
                message: "System is under maintenance. Please try again later.",
                maintenance: true
            });
        }
    } catch (err) {
        console.error("Config read error in middleware", err);
    }
    next();
};

app.use(maintenanceMiddleware);

app.use((req, res, next) => {
    console.log(`\n🔍 [Incoming Request] ${new Date().toISOString()}`);
    console.log(`📡 ${req.method} ${req.originalUrl || req.url}`);
    console.log(`📦 Body Size: ${req.body ? JSON.stringify(req.body).length : 0} bytes`);
    next();
});
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        version: "1.0.1", 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get("/api/docs", (req, res) => {
    res.status(200).json({ 
        message: "A1Care API Documentation",
        version: "1.0.0",
        endpoint: "https://api.a1carehospital.in/api",
        status: "Online"
    });
});

//routes
//authentication
app.use('/api/patient/auth', PatientAuth);

//services
app.use('/api/services', ServiceRoute)
app.use('/api/subservice', SuberServiceRoutes)
app.use('/api/childService', childServiceRoute)

//roles
app.use("/api/role", roleRoutes)

//doctors
app.use('/api/doctor', doctorRoutes)

//address
app.use('/api/patient/address', addressRoutes)

//bookings
app.use('/api/appointment', doctorAppointmentRoutes)
app.use('/api/service/booking', serviceBookingRoutes)

//admin
app.use('/api/admin', adminRoutes)

//tickets
app.use('/api/tickets', ticketRoutes)

//reviews
app.use('/api/reviews', reviewRoutes)

//wallet
app.use('/api/wallet', walletRoutes)

//payments
app.use('/api/payments', paymentRoutes)

//subscriptions
app.use('/api/subscription', partnerSubscriptionRoutes)

//chat
app.use('/api/chat', chatRoutes)

//notifications
app.use('/api/notifications', notificationRoutes)

//medical records (health vault)
app.use('/api/medical-records', medicalRecordRoutes)
app.use('/api/patient', patientMedicalHistoryRoutes)
app.use('/api/doctor/earnings', staffEarningsRoutes)
app.use('/api/agora', agoraRoutes)
app.use('/api/health-packages', healthPackageRoutes)

import { getPublicAppConfig } from "./modules/Admin/admin.controller.js";
app.get("/api/common/config/:appKey", getPublicAppConfig);


//error catching
app.use(errorHandler);

export default app


