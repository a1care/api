import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import doctorAppointmentModel from "../Bookings/doctorAppointment.model.js";
import serviceRequestModel from "../Bookings/service/serviceRequest.model.js";
import Payout from "./payout.model.js";
import Doctor from "../Doctors/doctor.model.js";
import mongoose from "mongoose";
import { getActiveCommissionRate } from "../PartnerSubscription/subscription.controller.js";


export const getEarningsSummary = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    if (!staffId) throw new ApiError(401, "Not authorized");

    const now = new Date();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date().setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch dynamic commission rate for this partner to replace legacy 0.8 fallback
    const commissionPct = await getActiveCommissionRate(staffId);
    const earningRatio = (100 - commissionPct) / 100;

    // 1. Doctor Appointments Earnings (Completed & Paid)
    const apptEarnings = await doctorAppointmentModel.aggregate([
        { 
            $match: { 
                doctorId: new mongoose.Types.ObjectId(staffId), 
                status: "Completed", 
                paymentStatus: "COMPLETED" 
            } 
        },
        {
            $facet: {
                total: [{ $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } }, count: { $sum: 1 } } }],
                today: [{ $match: { createdAt: { $gte: startOfToday } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } } } }],
                week: [{ $match: { createdAt: { $gte: startOfWeek } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } } } }],
                month: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } } } }]
            }
        }
    ]);

    // 2. Service Requests Earnings (COMPLETED & paid)
    const serviceEarnings = await serviceRequestModel.aggregate([
        { 
            $match: { 
                assignedProviderId: new mongoose.Types.ObjectId(staffId), 
                status: "COMPLETED" 
            } 
        },
        {
            $facet: {
                total: [{ $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } }, count: { $sum: 1 } } }],
                today: [{ $match: { createdAt: { $gte: startOfToday } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } } } }],
                week: [{ $match: { createdAt: { $gte: startOfWeek } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } } } }],
                month: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } } } }]
            }
        }
    ]);

    // 3. Payouts — include both PENDING and COMPLETED so the balance shown matches
    // the server-side validation in requestPayout (which also blocks on PENDING).
    const totalWithdrawn = await Payout.aggregate([
        { $match: { staffId: new mongoose.Types.ObjectId(staffId), status: { $in: ["PENDING", "APPROVED", "COMPLETED"] } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } }
    ]);

    const stats = {
        totalEarnings: (apptEarnings[0].total[0]?.sum || 0) + (serviceEarnings[0].total[0]?.sum || 0),
        jobsCompleted: (apptEarnings[0].total[0]?.count || 0) + (serviceEarnings[0].total[0]?.count || 0),
        today: (apptEarnings[0].today[0]?.sum || 0) + (serviceEarnings[0].today[0]?.sum || 0),
        thisWeek: (apptEarnings[0].week[0]?.sum || 0) + (serviceEarnings[0].week[0]?.sum || 0),
        thisMonth: (apptEarnings[0].month[0]?.sum || 0) + (serviceEarnings[0].month[0]?.sum || 0),
        withdrawn: totalWithdrawn[0]?.sum || 0
    };

    const balance = stats.totalEarnings - stats.withdrawn;

    // To include bankDetails, we need to fetch the staff/doctor details first.
    // Assuming 'staff' refers to the Doctor model for the current user.
    const staff = await Doctor.findById(staffId);

    return res.status(200).json(new ApiResponse(200, "Earnings summary fetched", { stats, balance, bankDetails: staff?.bankDetails }));
});

export const requestPayout = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    const { amount, payoutMethod, upiId, bankDetails } = req.body;

    if (!amount || amount < 500) throw new ApiError(400, "Minimum withdrawal is ₹500");

    const staff = await Doctor.findById(staffId);
    if (!staff) throw new ApiError(404, "Staff not found");

    const commissionPct = await getActiveCommissionRate(staffId);
    const earningRatio = (100 - commissionPct) / 100;

    let finalDetails: any = {};
    if (payoutMethod === "UPI") {
        if (!upiId) throw new ApiError(400, "UPI ID is required");
        finalDetails = { upiId };
    } else if (payoutMethod === "BANK") {
        if (!bankDetails || !bankDetails.accountNumber || !bankDetails.accountHolderName || !bankDetails.ifscCode || !bankDetails.bankName) {
            throw new ApiError(400, "All bank details are required for bank transfer");
        }
        finalDetails = bankDetails;
    } else {
        // Fallback to staff's registered bank details
        if (!staff.bankDetails?.accountNumber) {
            throw new ApiError(400, "Please update your bank details first or choose UPI");
        }
        finalDetails = staff.bankDetails;
    }

    // Server-side balance verification (prevents withdrawing more than earned)
    const [apptEarnings, serviceEarnings, totalWithdrawn] = await Promise.all([
        doctorAppointmentModel.aggregate([
            { $match: { doctorId: new mongoose.Types.ObjectId(staffId), status: "Completed", paymentStatus: "COMPLETED" } },
            { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$totalAmount", earningRatio] }] } } } }
        ]),
        serviceRequestModel.aggregate([
            { $match: { assignedProviderId: new mongoose.Types.ObjectId(staffId), status: "COMPLETED" } },
            { $group: { _id: null, sum: { $sum: { $ifNull: ["$partnerEarning", { $multiply: ["$price", earningRatio] }] } } } }
        ]),
        Payout.aggregate([
            { $match: { staffId: new mongoose.Types.ObjectId(staffId), status: { $in: ["PENDING", "APPROVED", "COMPLETED"] } } },
            { $group: { _id: null, sum: { $sum: "$amount" } } }
        ])
    ]);

    const totalEarned = (apptEarnings[0]?.sum || 0) + (serviceEarnings[0]?.sum || 0);
    const alreadyWithdrawn = totalWithdrawn[0]?.sum || 0;
    const availableBalance = totalEarned - alreadyWithdrawn;

    if (amount > availableBalance) {
        throw new ApiError(400, `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}`);
    }

    const payout = await Payout.create({
        staffId,
        amount,
        bankDetails: finalDetails,
        status: "PENDING"
    });

    return res.status(201).json(new ApiResponse(201, "Payout request submitted", payout));
});

export const getPayoutHistory = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    const payouts = await Payout.find({ staffId }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, "Payout history fetched", payouts));
});

export const getBookingEarningsHistory = asyncHandler(async (req, res) => {
    const staffId = req.user?.id;
    if (!staffId) throw new ApiError(401, "Not authorized");

    const commissionPct = await getActiveCommissionRate(staffId);
    const earningRatio = (100 - commissionPct) / 100;

    // 1. Fetch completed doctor appointments
    const appts = await doctorAppointmentModel.find({
        doctorId: staffId,
        status: "Completed",
        paymentStatus: "COMPLETED"
    }).select("createdAt partnerEarning totalAmount timeSlot").lean() as any[];

    const apptItems = appts.map((a: any) => ({
        _id: a._id,
        type: "Doctor Consultation",
        createdAt: a.createdAt,
        totalAmount: a.totalAmount,
        partnerEarning: a.partnerEarning || (a.totalAmount * earningRatio),
        details: a.timeSlot || "Scheduled Consultation"
    }));

    // 2. Fetch completed service requests
    const services = await serviceRequestModel.find({
        assignedProviderId: staffId,
        status: "COMPLETED"
    }).select("createdAt partnerEarning price serviceType patientName").lean() as any[];

    const serviceItems = services.map((s: any) => ({
        _id: s._id,
        type: s.serviceType || "Home Care Visit",
        createdAt: s.createdAt,
        totalAmount: s.price,
        partnerEarning: s.partnerEarning || (s.price * earningRatio),
        details: `Patient: ${s.patientName || "Guest"}`
    }));

    // Combine and sort chronologically
    const history = [...apptItems, ...serviceItems].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json(new ApiResponse(200, "Booking earnings history fetched", history));
});

