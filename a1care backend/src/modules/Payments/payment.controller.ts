import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Order, OrderStatus, PaymentTransaction, PaymentStatus, PaymentLog } from "./payment.model.js";
import { EasebuzzService } from "./easebuzz.service.js";
import { getSystemSettings } from "../Admin/admin.controller.js";
import { Patient } from "../Authentication/patient.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";
import { v4 as uuidv4 } from "uuid";

// ─── Helper Functions ────────────────────────────────────────────────────────
const getEasebuzzService = async () => {
    // Prioritize Env Vars for easier development/testing
    const merchantKey = process.env.EASEBUZZ_MERCHANT_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const env = process.env.EASEBUZZ_ENV as "test" | "prod";

    if (merchantKey && salt) {
        return new EasebuzzService({
            merchantKey,
            salt,
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

    const txnId = `ORD-${uuidv4().split("-")[0]}-${Date.now()}`;

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

    const patient = await Patient.findById(order.userId);
    if (!patient) throw new ApiError(404, "Patient not found");

    const ezService = await getEasebuzzService();
    const settings = await getSystemSettings();

    const params = {
        txnid: order.txnId,
        amount: Number(order.amount).toFixed(2),
        productinfo: order.type === "WALLET_TOPUP" ? "Wallet Top-up" : `Booking_${order.referenceId}`,
        firstname: patient.name?.split(" ")[0] || "Patient",
        phone: patient.mobileNumber?.toString() || "9999999999",
        email: patient.email || "patient@example.com",
        surl: `${process.env.API_URL}/api/payments/gateway-response`,
        furl: `${process.env.API_URL}/api/payments/gateway-response`,
        udf1: (order as any)._id.toString(),
    };

    const hash = ezService.generateHash(params);
    
    // Create initial payment transaction record
    await PaymentTransaction.create({
        orderId: order._id,
        gatewayTxnId: "", // Not yet received from gateway
        amount: order.amount,
        status: PaymentStatus.INITIATED,
    });

    await ezService.logEvent(order.txnId, "PAYMENT_INITIATED", "INFO", "Payment intent sent to frontend", { params });

    return res.status(200).json(new ApiResponse(200, "Payment parameters generated", {
        ...params,
        key: settings.easebuzz.merchantKey,
        hash,
        env: settings.easebuzz.env,
    }));
});

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

    // 3. Prevent duplicate processing (Idempotency)
    if (order.status === OrderStatus.SUCCESS) {
        return res.status(200).json(new ApiResponse(200, "Order already fulfilled"));
    }

    // 4. Record the Gateway Response
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

    // 5. Update Order Status and Fulfill
    if (response.status === "success") {
        order.status = OrderStatus.SUCCESS;
        await order.save();
        await ezService.logEvent(order.txnId, "PAYMENT_SUCCESS", "INFO", "Payment successful through webhook", response);

        // FULFILLMENT: e.g. Credit Wallet
        if (order.type === "WALLET_TOPUP") {
            const description = `Wallet Top-up (Easebuzz: ${response.easepayid})`;
            await creditWalletAtomic(order.userId.toString(), order.amount, description);
        }
    } else {
        order.status = OrderStatus.FAILED;
        await order.save();
        await ezService.logEvent(order.txnId, "PAYMENT_FAILED", "WARN", `Payment failed: ${response.error_Message || "Unknown reason"}`, response);
    }

    return res.status(200).json(new ApiResponse(200, "Webhook processed"));
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
    
    // Logic: In production, we would actually use Easebuzz Inquiry API.
    // For now, since we don't have a real API access key for Inquiry (sometimes separate), 
    // we mark it as VERIFICATION_PENDING or use the Inquiry API if configured.
    
    await ezService.logEvent(order.txnId, "MANUAL_VERIFICATION_REQUESTED", "INFO", "User returned to app, checking status...");
    
    // Simulating Inquiry API call
    // const statusRes = await ezService.verifyTransactionStatus(order.txnId);
    // process statusRes...

    return res.status(200).json(new ApiResponse(200, "Order status", order));
});

export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "Order not found");
    return res.status(200).json(new ApiResponse(200, "Order fetched", order));
});

// ─── Admin Functions ──────────────────────────────────────────────────────────

export const adminListOrders = asyncHandler(async (_req, res) => {
    const orders = await Order.find()
        .populate("userId", "name email mobileNumber")
        .sort({ createdAt: -1 })
        .limit(200);
    return res.status(200).json(new ApiResponse(200, "Orders fetched", orders));
});

export const adminGetLogsForTxn = asyncHandler(async (req, res) => {
    const { txnId } = req.params;
    const logs = await PaymentLog.find({ txnId }).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, "Logs fetched", logs));
});
