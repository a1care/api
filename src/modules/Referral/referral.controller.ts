import crypto from "crypto";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Patient } from "../Authentication/patient.model.js";
import Referral from "./referral.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";

const REFERRAL_REWARD = 100; // ₹100 wallet credit for referrer

/** Generate a unique 6-char uppercase referral code */
const generateCode = async (): Promise<string> => {
  let code: string;
  let exists = true;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
    exists = !!(await Patient.findOne({ referralCode: code }));
  } while (exists);
  return code;
};

/** GET /api/referral/my-code — returns current patient's referral code */
export const getMyReferralCode = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  const patient = await Patient.findById(patientId).select("referralCode name mobileNumber");
  if (!patient) throw new ApiError(404, "Patient not found");

  // Auto-generate if missing (lazy init)
  if (!patient.referralCode) {
    patient.referralCode = await generateCode();
    await patient.save();
  }

  return res.status(200).json(
    new ApiResponse(200, "Referral code fetched", {
      referralCode: patient.referralCode,
      shareMessage: `Use my code ${patient.referralCode} on A1Care to get ₹${REFERRAL_REWARD} off your first booking!`,
    })
  );
});

/** POST /api/referral/validate — preview discount before booking */
export const validateReferralCode = asyncHandler(async (req, res) => {
  const patientId = req.user?.id;
  const { code } = req.body;
  if (!code) throw new ApiError(400, "Referral code is required");

  const referrer = await Patient.findOne({ referralCode: code.toUpperCase().trim() }).select("_id name referralCode");
  if (!referrer) throw new ApiError(404, "Invalid referral code");

  if (String(referrer._id) === String(patientId)) {
    throw new ApiError(400, "You cannot use your own referral code");
  }

  // Check if this patient already used a referral code
  const alreadyUsed = await Referral.findOne({ refereeId: patientId });
  if (alreadyUsed) throw new ApiError(400, "You have already used a referral code");

  return res.status(200).json(
    new ApiResponse(200, "Valid referral code", {
      referrerId: referrer._id,
      referrerName: referrer.name || "A1Care Member",
      rewardAmount: REFERRAL_REWARD,
    })
  );
});

/**
 * Internal helper — call this after a booking is created.
 * Credits the referrer ₹100 and marks the referral REWARDED.
 */
export const applyReferralReward = async (
  patientId: string,
  referralCode: string,
  bookingId: string
): Promise<void> => {
  try {
    const code = referralCode.toUpperCase().trim();
    const referrer = await Patient.findOne({ referralCode: code }).select("_id");
    if (!referrer) return;

    if (String(referrer._id) === String(patientId)) return;

    // Race-safe: the unique index on refereeId means only ONE Referral can ever be
    // inserted per referee. If two concurrent bookings race here, the second insert
    // throws a duplicate-key error and we bail without double-crediting the referrer.
    let referral;
    try {
      referral = await Referral.create({
        referrerId: referrer._id,
        refereeId: patientId,
        referralCode: code,
        status: "REWARDED",
        rewardAmount: REFERRAL_REWARD,
        appliedOnBookingId: bookingId,
      });
    } catch (e: any) {
      if (e?.code === 11000) return; // already rewarded for this referee
      throw e;
    }

    // Credit referrer's wallet (idempotent on the referral id)
    await creditWalletAtomic(
      String(referrer._id),
      REFERRAL_REWARD,
      `REFERRAL_REWARD:${referral._id}`
    );

    console.log(`[Referral] ₹${REFERRAL_REWARD} credited to ${referrer._id} for referral code ${code}`);
  } catch (err) {
    console.error("[Referral] applyReferralReward error:", err);
  }
};

/** GET /api/referral/stats — admin: list all referrals */
export const getReferralStats = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [total, rewarded, referrals] = await Promise.all([
    Referral.countDocuments(),
    Referral.countDocuments({ status: "REWARDED" }),
    Referral.find()
      .populate("referrerId", "name mobileNumber")
      .populate("refereeId", "name mobileNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Referral stats fetched", {
      items: referrals,
      total,
      rewarded,
      totalRewardPaid: rewarded * REFERRAL_REWARD,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    })
  );
});
