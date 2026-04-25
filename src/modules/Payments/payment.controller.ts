import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Order, OrderStatus, PaymentTransaction, PaymentStatus, PaymentLog } from "./payment.model.js";
import { EasebuzzService } from "./easebuzz.service.js";
import { getSystemSettings } from "../Admin/admin.controller.js";
import { Patient } from "../Authentication/patient.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";

// ─── Helper Functions ────────────────────────────────────────────────────────
const getEasebuzzService = async (): Promise<EasebuzzService> => {
    // Prioritize Env Vars for easier development/testing
    const merchantKey = process.env.EASEBUZZ_MERCHANT_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const env = process.env.EASEBUZZ_ENV as "test" | "prod";

    if (merchantKey && salt) {
        return new EasebuzzService({
            merchantKey: merchantKey.trim(),
            salt: salt.trim(),
            env: env || "test",
        });
    }

    const settings = await getSystemSettings();
    if (!settings.easebuzz.merchantKey || !settings.easebuzz.salt) {
        throw new ApiError(500, "Easebuzz gateway not configured");
    }
    return new EasebuzzService({
        merchantKey: settings.easebuzz.merchantKey,
        salt: settings.easebuzz.salt,
        env: settings.easebuzz.env as "test" | "prod",
    });
};

// ─── Controller Functions ────────────────────────────────────────────────────

/**
 * Creates an order in the database before payment initiation.
 * Ensures amount is set from backend.
 */
export const createOrder = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { amount, type, referenceId } = req.body;

    if (!amount || amount <= 0) throw new ApiError(400, "Invalid amount");
    if (!["WALLET_TOPUP", "BOOKING"].includes(type)) throw new ApiError(400, "Invalid order type");

    const uuidParts = uuidv4().split("-");
    const prefix = uuidParts[0] || "random";
    const txnId = `OR-${prefix.slice(0, 6)}-${Date.now()}`;

    const order = await Order.create({
        userId,
        amount,
        type,
        referenceId,
        txnId,
        status: OrderStatus.PENDING,
    });

    const ezService = await getEasebuzzService();
    await ezService.logEvent(txnId, "ORDER_CREATED", "INFO", "Order created in database", { orderId: (order as any)._id, type, amount });

    return res.status(201).json(new ApiResponse(201, "Order created", order));
});

/**
 * Initiates the payment by generating the hash for Easebuzz.
 * Prevents double initiation if needed.
 */
export const initiatePayment = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");

    if (order.status !== OrderStatus.PENDING) {
        throw new ApiError(400, `Order already in ${order.status} state. Cannot re-initiate.`);
    }

    const patient = await Patient.findById((order as any).userId) || await (await import("../Doctors/doctor.model.js")).default.findById((order as any).userId);
    if (!patient) throw new ApiError(404, "User not found for payment");

    const ezService = await getEasebuzzService();
    const settings = await getSystemSettings();

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const redirectUrl = `${baseUrl}/api/payments/gateway-response`;

    const finalKey = process.env.EASEBUZZ_MERCHANT_KEY || settings.easebuzz.merchantKey;
    const finalEnv = (process.env.EASEBUZZ_ENV as any) || settings.easebuzz.env;

    const firstName = ((patient as any).name || "Patient").trim().split(" ")[0].replace(/[^a-zA-Z]/g, "") || "Patient";

    const params: any = {
        txnid: order.txnId,
        amount: Number(order.amount).toFixed(2),
        productinfo: "A1Care",
        firstname: firstName,
        phone: (patient.mobileNumber?.toString() || "9999999999").replace(/[^0-9]/g, "").slice(-10),
        email: (patient.email && patient.email.includes("@")) ? patient.email.trim() : "patient@example.com",
        surl: redirectUrl,
        furl: redirectUrl,
        udf1: (order as any)._id?.toString() || "",
        address1: "A1Care Test Street",
        address2: "District HQ",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        zipcode: "500001"
    };

    console.log(`\n💳 [Easebuzz Init] Order: ${order.txnId} (${order.amount})`);
    console.log(`🔑 Key: ${finalKey} | Env: ${finalEnv}`);
    console.log(`🔗 Redirect: ${redirectUrl}`);
    console.log(`📝 Params:`, JSON.stringify(params, null, 2));

    const debugMsg = `
[${new Date().toISOString()}] ATTEMPTING_INITIATION
Order: ${order.txnId} | Amount: ${order.amount}
MerchantKey: ${finalKey} | Env: ${finalEnv}
RedirectURL: ${redirectUrl}
Params: ${JSON.stringify(params, null, 2)}
--------------------------------------------------\n`;
    await fs.appendFile(path.join(process.cwd(), "payment_debug.log"), debugMsg).catch(err => console.error("Logger Failed:", err));

    // Server-to-Server initiation to get access_key
    const apiResult = await ezService!.initiatePaymentApi(params);
    
    // Log the API Result to file for debugging
    const resultMsg = `
[${new Date().toISOString()}] GATEWAY_RESPONSE_RAW
TxnID: ${order.txnId}
Status: ${apiResult.status}
Data/Message: ${JSON.stringify(apiResult.data || apiResult.error_desc || apiResult.message || apiResult, null, 2)}
--------------------------------------------------\n`;
    await fs.appendFile(path.join(process.cwd(), "payment_debug.log"), resultMsg).catch(() => {});

    console.log("💳 Easebuzz API Response:", JSON.stringify(apiResult, null, 2));

    if (apiResult.status !== 1) {
        console.error("🔴 Easebuzz API Initiation Failed:", apiResult);
        const errorDetail = apiResult.data || apiResult.error_desc || apiResult.message || "Unknown Gateway Error";
        throw new ApiError(400, `Easebuzz Initiation Failed: ${errorDetail} (Raw: ${JSON.stringify(apiResult)})`);
    }

    const accessKey = apiResult.data;
    console.log(`🔑 Access Key Received: ${accessKey}`);

    // Create initial payment transaction record
    await PaymentTransaction.create({
        orderId: order._id,
        gatewayTxnId: "",
        amount: order.amount,
        status: PaymentStatus.INITIATED,
    });

    await ezService.logEvent(order.txnId, "PAYMENT_INITIATED_V2", "INFO", "Access Key generated", { params, accessKey });

    return res.status(200).json(new ApiResponse(200, "Payment initiated", {
        accessKey,
        env: finalEnv,
        orderId: order._id,
    }));
});

// Import the booking models for fulfillment
import DoctorAppointment from "../Bookings/doctorAppointment.model.js";
import ServiceRequest from "../Bookings/service/serviceRequest.model.js";

/**
 * Internal helper to fulfill an order and its associated reference (e.g., Booking).
 */
const fulfillOrder = async (order: any, response: any, ezService: EasebuzzService) => {
    if (order.status === OrderStatus.SUCCESS) return;

    console.log(`🎁 [Fulfillment] Starting for Order: ${order.txnId} (Type: ${order.type})`);
    
    // 1. Mark Order as Success
    order.status = OrderStatus.SUCCESS;
    await order.save();
    await ezService.logEvent(order.txnId, "PAYMENT_FULFILLED", "INFO", "Order marked as Success", response);

    // 2. Specialized Fulfillment Logic
    if (order.type === "WALLET_TOPUP") {
        const description = `Wallet Top-up (Easebuzz: ${response.easepayid || response.txnid})`;
        await creditWalletAtomic(order.userId.toString(), order.amount, description);
        await ezService.logEvent(order.txnId, "WALLET_CREDITED", "INFO", `Credited ${order.amount} to wallet`);
    } 
    else if (order.type === "BOOKING" && order.referenceId) {
        // Try Doctor Appointment
        const appointment = await DoctorAppointment.findById(order.referenceId);
        if (appointment) {
            appointment.paymentStatus = "COMPLETED";
            appointment.status = "Confirmed";
            appointment.isConfirmed = true;
            await appointment.save();
            await ezService.logEvent(order.txnId, "BOOKING_CONFIRMED", "INFO", `Confirmed Doctor Appointment: ${order.referenceId}`);
        } else {
            const serviceReq = await ServiceRequest.findById(order.referenceId);
            if (serviceReq) {
                serviceReq.paymentStatus = "COMPLETED";
                await serviceReq.save();
                await ezService.logEvent(order.txnId, "BOOKING_CONFIRMED", "INFO", `Updated Service Request payment: ${order.referenceId}`);
            }
        }
    } else if (order.type === "SUBSCRIPTION" && order.referenceId) {
        const PartnerSubscription = (await import("../PartnerSubscription/subscription.model.js")).default;
        const sub = await PartnerSubscription.findByIdAndUpdate(order.referenceId, { status: "Active" }, { new: true });
        if (sub) {
            await ezService.logEvent(order.txnId, "SUBSCRIPTION_ACTIVATED", "INFO", `Activated subscription: ${order.referenceId}`);
        }
    }
};

/**
 * Handles Webhook from Easebuzz (Most Reliable).
 */
export const handleWebhook = asyncHandler(async (req, res) => {
    const response = req.body;
    const ezService = await getEasebuzzService();

    // 1. Verify Hash
    const isValid = ezService.verifyResponseHash(response);
    if (!isValid) {
        await ezService.logEvent(response.txnid || "UKNOWN", "WEBHOOK_HASH_MISMATCH", "ERROR", "Checksum mismatch on webhook", response);
        throw new ApiError(400, "Invalid checksum");
    }

    // 2. Find Order
    const order = await Order.findOne({ txnId: response.txnid });
    if (!order) {
        await ezService.logEvent(response.txnid, "WEBHOOK_ORDER_NOT_FOUND", "ERROR", "Webhook received for non-existent order", response);
        return res.status(404).json(new ApiResponse(404, "Order not found"));
    }

    // 3. Record the Gateway Response
    await PaymentTransaction.findOneAndUpdate(
        { orderId: order._id },
        {
            gatewayTxnId: response.easepayid,
            gatewayResponse: response,
            paymentMethod: response.mode,
            status: response.status === "success" ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        },
        { upsert: true }
    );

    // 4. Fulfill Order
    if (response.status === "success") {
        await fulfillOrder(order, response, ezService);
    } else {
        if (order.status !== OrderStatus.SUCCESS) {
            order.status = OrderStatus.FAILED;
            await order.save();
            await ezService.logEvent(order.txnId, "PAYMENT_FAILED", "WARN", `Payment failed: ${response.error_Message || "Unknown reason"}`, response);
        }
    }

    return res.status(200).json(new ApiResponse(200, "Webhook processed"));
});

/**
 * Handles the visible Redirect from Easebuzz (Synchronous).
 */
export const handleGatewayResponse = asyncHandler(async (req, res) => {
    console.log(`\n📥 [Easebuzz Gateway Response Entry] Method: ${req.method}`);
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
    console.log(`Query:`, JSON.stringify(req.query, null, 2));
    
    const response = req.method === "POST" ? req.body : req.query;
    const ezService = await getEasebuzzService();

    // Persistent log for debugging using static fs import
    try {
        const logData = `\n[${new Date().toISOString()}] REDIRECT: ${JSON.stringify(response, null, 2)}\n`;
        require('fs').appendFileSync('payment_debug.log', logData);
    } catch (err) {
        console.error("Failed to log redirect:", err);
    }

    console.log(`🔗 [Easebuzz Redirect] User returned for Txn: ${response.txnid}`);

    // Verify Hash
    const isValid = ezService.verifyResponseHash(response);
    
    // Find Order
    const order = await Order.findOne({ txnId: response.txnid });
    
    const isTrueSuccess = response.status === "success" || response.status === "1";
    
    if (isValid && order && isTrueSuccess) {
        await fulfillOrder(order, response, ezService);
    }

    // Response HTML for WebView to detect
    const isSuccess = (response.status === "success" || response.status === "1") && (order?.status === OrderStatus.SUCCESS || isValid);
    const statusMsg = isSuccess ? "Payment Successful" : "Payment Failed";
    const statusIcon = isSuccess ? "✅" : "❌";

    res.send(`
        <html><head><title>${statusMsg}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:20%; background-color:#F8FAFC;">
            <div style="font-size:60px;">${statusIcon}</div>
            <h2 style="color:#1E293B;">${statusMsg}</h2>
            <p style="color:#64748B;">${isSuccess ? "Your transaction has been confirmed." : "Something went wrong with the payment."}</p>
            <p style="color:#94A3B8; font-size:12px;">Order ID: ${response.txnid}</p>
            <div style="margin-top:20px;"><p>Returning you to A1Care...</p></div>
        </body></html>
    `);
});

/**
 * Manually verify the payment status using a Polling mechanism or On-Return.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");

    if (order.status === OrderStatus.SUCCESS) {
        return res.status(200).json(new ApiResponse(200, "Payment verified as Success", order));
    }

    const ezService = await getEasebuzzService();
    await ezService.logEvent(order.txnId, "MANUAL_VERIFICATION_REQUESTED", "INFO", "User returned to app, checking status...");

    // Call Easebuzz Inquiry API
    // Call Easebuzz Inquiry API
    const statusRes = await ezService.verifyTransactionStatus(order.txnId);
    console.log(`🔍 [Easebuzz Inquiry Response] Order: ${order.txnId}`, JSON.stringify(statusRes, null, 2));

    // Handle SUCCESS response (status: 1 and data is object)
    if (statusRes.status === 1 && statusRes.data && typeof statusRes.data === 'object') {
        const response = statusRes.data;
        const gatewayStatus = (response.status || "").toString().toLowerCase();

        await PaymentTransaction.findOneAndUpdate(
            { orderId: order._id },
            {
                gatewayTxnId: response.easepayid,
                gatewayResponse: response,
                paymentMethod: response.mode,
                status: (gatewayStatus === "success" || gatewayStatus === "successful") ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
            },
            { upsert: true }
        );

        if (gatewayStatus === "success" || gatewayStatus === "successful") {
            await fulfillOrder(order, response, ezService);
        } else if (gatewayStatus !== "pending") {
            order.status = OrderStatus.FAILED;
            await order.save();
        }
    } else {
        // Handle FAILURE or PENDING messages
        const errorMsg = typeof statusRes.data === 'string' ? statusRes.data : (statusRes.msg || "Inquiry Failed");
        
        // If it's just 'Transaction not found yet', we don't treat it as a hard failure, just return current order
        if (errorMsg.includes("not found yet") || errorMsg.includes("Pending")) {
            return res.status(200).json(new ApiResponse(200, "Transaction still pending at gateway", order));
        }

        await ezService.logEvent(order.txnId, "VERIFICATION_ERROR", "ERROR", errorMsg);
        throw new ApiError(400, `Gateway Verification Failed: ${errorMsg}`);
    }

    return res.status(200).json(new ApiResponse(200, "Order status updated", order));
});

export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "Order not found");
    return res.status(200).json(new ApiResponse(200, "Order fetched", order));
});

// ─── Admin Functions ──────────────────────────────────────────────────────────

export const adminListOrders = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const requestedLimit = Number(req.query.limit) || 50;
    const limit = Math.min(100, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "ALL").trim().toUpperCase();

    const match: any = {};
    if (status && status !== "ALL") {
        match.status = status;
    }

    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        match.$or = [
            { txnId: regex },
            { "user.name": regex },
            { "user.mobileNumber": regex }
        ];
    }

    const pipeline: any[] = [
        {
            $lookup: {
                from: "patients",
                localField: "userId",
                foreignField: "_id",
                as: "userPatient"
            }
        },
        {
            $lookup: {
                from: "doctors",
                localField: "userId",
                foreignField: "_id",
                as: "userDoctor"
            }
        },
        {
            $addFields: {
                user: {
                    $ifNull: [
                        { $arrayElemAt: ["$userPatient", 0] },
                        { $arrayElemAt: ["$userDoctor", 0] }
                    ]
                }
            }
        },
        { $match: match },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                txnId: 1,
                amount: 1,
                status: 1,
                type: 1,
                userId: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                    name: "$user.name",
                    email: "$user.email",
                    mobileNumber: "$user.mobileNumber"
                }
            }
        },
        {
            $facet: {
                items: [{ $skip: skip }, { $limit: limit }],
                meta: [{ $count: "total" }]
            }
        }
    ];

    const result = await Order.aggregate(pipeline);
    const row = result?.[0] || { items: [], meta: [] };
    const items = (row.items || []).map((order: any) => ({
        _id: order._id,
        txnId: order.txnId,
        amount: order.amount,
        status: order.status,
        type: order.type,
        userId: order.user || order.userId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    }));
    const total = row.meta?.[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json(new ApiResponse(200, "Orders fetched", {
        items,
        total,
        page,
        limit,
        totalPages
    }));
});

export const adminGetLogsForTxn = asyncHandler(async (req, res) => {
    const { txnId } = req.params;
    const logs = await PaymentLog.find({ txnId }).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, "Logs fetched", logs));
});

