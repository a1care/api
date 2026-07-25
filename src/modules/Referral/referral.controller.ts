import crypto from "crypto";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import Referral from "./referral.model.js";
import ReferralConfig from "./referralConfig.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";

// Fetch dynamic config
const getConfig = async () => {
  let config = await ReferralConfig.findOne();
  if (!config) {
    config = await ReferralConfig.create({ customerRewardAmount: 100, partnerRewardAmount: 100 });
  }
  return config;
};

const generateCode = async (): Promise<string> => {
  let code: string;
  let exists = true;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const patientExists = await Patient.findOne({ referralCode: code });
    const doctorExists = await Doctor.findOne({ referralCode: code });
    exists = !!(patientExists || doctorExists);
  } while (exists);
  return code;
};

export const getMyReferralCode = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role; // 'Patient' or 'Staff'
  
  let user;
  if (role === 'Patient') {
    user = await Patient.findById(userId).select("referralCode name mobileNumber");
  } else {
    user = await Doctor.findById(userId).select("referralCode name mobileNumber");
  }
  
  if (!user) throw new ApiError(404, "User not found");

  // Auto-generate if missing (lazy init)
  if (!user.referralCode) {
    user.referralCode = await generateCode();
    await user.save();
  }

  const config = await getConfig();
  const reward = role === 'Patient' ? config.customerRewardAmount : config.partnerRewardAmount;

  return res.status(200).json(
    new ApiResponse(200, "Referral code fetched", {
      referralCode: user.referralCode,
      shareMessage: `Use my code ${user.referralCode} on A1Care to get ₹${reward} off your first booking/job!`,
      rewardAmount: reward,
    })
  );
});

export const validateReferralCode = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { code } = req.body;
  if (!code) throw new ApiError(400, "Referral code is required");

  let referrer: any = await Patient.findOne({ referralCode: code.toUpperCase().trim() }).select("_id name referralCode");
  let referrerModel = "Patient";
  
  if (!referrer) {
    referrer = await Doctor.findOne({ referralCode: code.toUpperCase().trim() }).select("_id name referralCode");
    referrerModel = "Doctor";
  }
  
  if (!referrer) throw new ApiError(404, "Invalid referral code");

  if (String(referrer._id) === String(userId)) {
    throw new ApiError(400, "You cannot use your own referral code");
  }

  // Check if this user already used a referral code
  const alreadyUsed = await Referral.findOne({ refereeId: userId });
  if (alreadyUsed) throw new ApiError(400, "You have already used a referral code");

  const config = await getConfig();
  const reward = referrerModel === 'Patient' ? config.customerRewardAmount : config.partnerRewardAmount;

  return res.status(200).json(
    new ApiResponse(200, "Valid referral code", {
      referrerId: referrer._id,
      referrerName: referrer.name || "A1Care Member",
      rewardAmount: reward,
    })
  );
});

/**
 * Internal helper — call this after a booking is created.
 * Credits the referrer ₹100 and marks the referral REWARDED.
 */
export const applyReferralReward = async (
  userId: string,
  userModel: "Patient" | "Doctor",
  referralCode: string,
  bookingId?: string
): Promise<void> => {
  try {
    const code = referralCode.toUpperCase().trim();
    let referrer: any = await Patient.findOne({ referralCode: code }).select("_id");
    let referrerModel = "Patient";
    
    if (!referrer) {
      referrer = await Doctor.findOne({ referralCode: code }).select("_id");
      referrerModel = "Doctor";
    }
    
    if (!referrer) return;

    if (String(referrer._id) === String(userId)) return;

    let referral;
    const config = await getConfig();
    const reward = referrerModel === 'Patient' ? config.customerRewardAmount : config.partnerRewardAmount;

    try {
      referral = await Referral.create({
        referrerId: referrer._id,
        referrerModel,
        refereeId: userId,
        refereeModel: userModel,
        referralCode: code,
        status: "REWARDED",
        rewardAmount: reward,
        appliedOnBookingId: bookingId,
      });
    } catch (e: any) {
      if (e?.code === 11000) return; // already rewarded for this referee
      throw e;
    }

    // Credit referrer's wallet
    await creditWalletAtomic(
      String(referrer._id),
      reward,
      `REFERRAL_REWARD:${referral._id}`
    );

    console.log(`[Referral] ₹${reward} credited to ${referrer._id} for referral code ${code}`);
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

  // sum of all rewardAmounts
  const totalRewardPaidAggr = await Referral.aggregate([
    { $match: { status: "REWARDED" } },
    { $group: { _id: null, total: { $sum: "$rewardAmount" } } }
  ]);
  const totalRewardPaid = totalRewardPaidAggr[0]?.total || 0;

  return res.status(200).json(
    new ApiResponse(200, "Referral stats fetched", {
      items: referrals,
      total,
      rewarded,
      totalRewardPaid,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    })
  );
});

// Admin config routes
export const getReferralConfig = asyncHandler(async (req, res) => {
  const config = await getConfig();
  return res.status(200).json(new ApiResponse(200, "Config fetched", config));
});

export const updateReferralConfig = asyncHandler(async (req, res) => {
  const { customerRewardAmount, partnerRewardAmount } = req.body;
  let config = await ReferralConfig.findOne();
  if (!config) {
    config = new ReferralConfig();
  }
  if (customerRewardAmount !== undefined) config.customerRewardAmount = customerRewardAmount;
  if (partnerRewardAmount !== undefined) config.partnerRewardAmount = partnerRewardAmount;
  await config.save();
  return res.status(200).json(new ApiResponse(200, "Config updated", config));
});
