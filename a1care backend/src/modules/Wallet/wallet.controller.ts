import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import WalletModel from "./wallet.model.js";
import { getSystemSettings } from "../Admin/admin.controller.js";
import { Patient } from "../Authentication/patient.model.js";
import { generateEasebuzzHash, verifyEasebuzzResponse } from "./easebuzz.utils.js";
import { enqueueEmail } from "../../queues/communicationQueue.js";
import { v4 as uuidv4 } from "uuid";

const txNotExists = (description: string) => ({
    $not: { $elemMatch: { description } }
});

export const creditWalletAtomic = async (userId: string, amount: number, description: string) => {
    const tx = {
        amount,
        type: "Credit" as const,
        description,
        date: new Date()
    };

    // Ensure wallet exists (avoids duplicate-key risk with upserts + idempotency filters).
    await WalletModel.updateOne(
        { userId },
        { $setOnInsert: { userId, balance: 0, transactions: [] } },
        { upsert: true }
    );

    const updated = await WalletModel.findOneAndUpdate(
        { userId, transactions: txNotExists(description) },
        { $inc: { balance: amount }, $push: { transactions: tx } },
        { new: true }
    );

    if (updated) {
        return { wallet: updated, applied: true };
    }

    const wallet = await WalletModel.findOne({ userId });
    return { wallet, applied: false };
};

export const debitWalletAtomic = async (userId: string, amount: number, description: string) => {
    const tx = {
        amount,
        type: "Debit" as const,
        description: description || "Payment from wallet",
        date: new Date()
    };

    return WalletModel.findOneAndUpdate(
        { userId, balance: { $gte: amount } },
        {
            $inc: { balance: -amount },
            $push: { transactions: tx }
        },
        { new: true }
    );
};

export const getWallet = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Not authorized");

    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
        wallet = await WalletModel.create({ userId, balance: 0, transactions: [] });
    }

    return res.status(200).json(new ApiResponse(200, "Wallet fetched", wallet));
});

export const initiatePayment = asyncHandler(async (req, res) => {
    const user = req.user as { id: string };
    const userId = user.id;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) throw new ApiError(400, "Invalid amount");

    const patient = await Patient.findById(userId);
    if (!patient) throw new ApiError(404, "User not found");

    const settings = await getSystemSettings();
    if (!settings.easebuzz.merchantKey || !settings.easebuzz.salt) {
        throw new ApiError(500, "Payment gateway not configured");
    }

    const txnid = `tx-${uuidv4().split('-')[0]}-${Date.now()}`;
    const params = {
        txnid,
        amount: Number(amount).toFixed(2),
        productinfo: description || "Wallet Top-up",
        firstname: patient.name?.split(' ')[0] || "User",
        phone: patient.mobileNumber?.toString() || "9999999999",
        email: patient.email || "test@example.com",
        surl: `${process.env.API_URL || "http://localhost:5000"}/api/wallet/response`,
        furl: `${process.env.API_URL || "http://localhost:5000"}/api/wallet/response`,
        udf1: userId || "",
    };

    const hash = generateEasebuzzHash(params, settings.easebuzz.merchantKey, settings.easebuzz.salt);

    return res.status(200).json(new ApiResponse(200, "Payment initiated", {
        ...params,
        key: settings.easebuzz.merchantKey,
        hash,
        env: settings.easebuzz.env
    }));
});

export const handlePaymentResponse = asyncHandler(async (req, res) => {
    // This could be the webhook or sucess return
    const response = req.body;
    const settings = await getSystemSettings();

    const isValid = verifyEasebuzzResponse(response, settings.easebuzz.salt);
    if (!isValid) {
        throw new ApiError(400, "Invalid checksum from gateway");
    }

    if (response.status === "success") {
        const userId = response.udf1;
        const amount = parseFloat(response.amount);

        const description = `Easebuzz: ${response.productinfo} (${response.txnid})`;
        const { applied } = await creditWalletAtomic(userId, amount, description);

        // ── New: Send Confirmation Email ───────────────────────────────────
        if (applied) {
            const patient = await Patient.findById(userId);
            if (patient?.email) {
                await enqueueEmail({
                    kind: "wallet_topup",
                    data: {
                        email: patient.email,
                        fullName: patient.name || "User",
                        amount: amount.toString(),
                        txnid: response.txnid,
                    },
                });
            }
        }
    }

    // Redirect or Send Response
    return res.status(200).json(new ApiResponse(200, "Payment processed", { status: response.status }));
});

export const addMoney = asyncHandler(async (req, res) => {
    // If admin is adding money to a specific patient, they provide patientId in body
    const targetUserId = req.body.userId || req.body.patientId || req.user?.id;
    const { amount, description } = req.body;

    if (!targetUserId) throw new ApiError(400, "Target User ID is required");
    if (!amount || amount <= 0) throw new ApiError(400, "Invalid amount");

    // Use a unique default description if none provided to avoid idempotency blocks on second manual add
    const finalDescription = description || `Manual Adjustment (${new Date().toLocaleString()})`;

    const { wallet, applied } = await creditWalletAtomic(targetUserId as string, amount, finalDescription);

    if (!applied) {
        throw new ApiError(400, "This adjustment has already been applied (Duplicate Description)");
    }

    // ── New: Send Confirmation Email ───────────────────────────────────────
    const patient = await Patient.findById(targetUserId);
    if (patient?.email) {
        await enqueueEmail({
            kind: "wallet_topup",
            data: {
                email: patient.email,
                fullName: patient.name || "User",
                amount: amount.toString(),
                txnid: "ADJ-" + Date.now().toString().slice(-6),
            },
        });
    }

    return res.status(200).json(new ApiResponse(200, "Money added successfully", wallet));
});

export const processPaymentFromWallet = async (userId: string, amount: number, description: string) => {
    const wallet = await debitWalletAtomic(userId, amount, description);
    if (!wallet) throw new Error("Insufficient wallet balance");
    return wallet;
};
