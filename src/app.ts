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
import couponRoutes from './modules/Coupons/coupon.routes.js'
import referralRoutes from './modules/Referral/referral.routes.js'
const PORT = process.env.PORT || 3000

const app = express()

// CORS only affects browser clients (admin panel / web). Native mobile apps send no
// Origin header and are unaffected. Lock browser origins to our own domains.
app.use(cors({
    origin: [
        "https://admin.a1carehospital.in",
        "https://a1carehospital.in",
        /\.a1carehospital\.in$/,
        ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173", "http://localhost:3000"] : []),
    ],
    credentials: true,
}));

// Cap request body size so a huge payload can't be fully buffered before rejection.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

import { readConfigStore } from "./modules/Admin/admin.controller.js";

// Cache the maintenance flag in-memory so we don't read the config store on every
// request. Busted immediately when an admin toggles maintenance (see invalidateMaintenanceCache).
let _maintenanceCached: boolean | null = null;
let _maintenanceCacheAt = 0;
const MAINTENANCE_TTL_MS = 30_000;

export const invalidateMaintenanceCache = () => {
    _maintenanceCached = null;
    _maintenanceCacheAt = 0;
};

const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Bypass for admin routes and health checks
    if (req.url.startsWith("/api/admin") || req.url === "/api/health" || req.url.startsWith("/api/common/config")) {
        return next();
    }

    try {
        const now = Date.now();
        if (_maintenanceCached === null || now - _maintenanceCacheAt > MAINTENANCE_TTL_MS) {
            const config = await readConfigStore();
            _maintenanceCached = config.system?.maintenanceMode ?? false;
            _maintenanceCacheAt = now;
        }
        if (_maintenanceCached) {
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

if (process.env.NODE_ENV !== "production") {
    app.use((req, _res, next) => {
        console.log(`[${req.method}] ${req.originalUrl || req.url}`);
        next();
    });
}
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
app.use('/api/nurse/earnings', staffEarningsRoutes)
app.use('/api/ambulance/earnings', staffEarningsRoutes)
app.use('/api/agora', agoraRoutes)
app.use('/api/health-packages', healthPackageRoutes)

//coupons
app.use('/api/coupons', couponRoutes)

//referrals
app.use('/api/referral', referralRoutes)

import { getPublicAppConfig } from "./modules/Admin/admin.controller.js";
app.get("/api/common/config/:appKey", getPublicAppConfig);


//error catching
app.use(errorHandler);

export default app


