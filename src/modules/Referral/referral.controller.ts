import crypto from "crypto";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import Referral from "./referral.model.js";
import ReferralConfig from "./referralConfig.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";
import Jimp from "jimp";
import path from "path";
import mongoose from "mongoose";

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
      shareMessage: `Use my code ${user.referralCode} on A1Care to get ₹${reward} off your first booking/job!\n\nhttps://api.a1carehospital.in/api/admin/referral/share-image?code=${user.referralCode}`,
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
    referrerModel = "staff";
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
 * Creates a PENDING referral record. Does NOT credit wallet yet.
 */
export const recordReferralUse = async (
  userId: string,
  userModel: "Patient" | "staff",
  referralCode: string,
  bookingId?: string
): Promise<void> => {
  try {
    const code = referralCode.toUpperCase().trim();
    let referrer: any = await Patient.findOne({ referralCode: code }).select("_id");
    let referrerModel = "Patient";

    if (!referrer) {
      referrer = await Doctor.findOne({ referralCode: code }).select("_id");
      referrerModel = "staff";
    }
    
    if (!referrer) return;

    if (String(referrer._id) === String(userId)) return;

    const config = await getConfig();
    const reward = referrerModel === 'Patient' ? config.customerRewardAmount : config.partnerRewardAmount;

    try {
      await Referral.create({
        referrerId: referrer._id,
        referrerModel,
        refereeId: userId,
        refereeModel: userModel,
        referralCode: code,
        status: "PENDING",
        rewardAmount: reward,
        appliedOnBookingId: bookingId,
      });
      console.log(`[Referral] PENDING referral recorded for referee ${userId}, code ${code}`);
    } catch (e: any) {
      if (e?.code === 11000) return; // already exists for this referee
      throw e;
    }
  } catch (err) {
    console.error("[Referral] recordReferralUse error:", err);
  }
};

/**
 * Internal helper — call this when a booking is completed.
 * Changes PENDING to REWARDED and credits the referrer.
 */
export const completeReferralReward = async (bookingId: string): Promise<void> => {
  try {
    const referral = await Referral.findOne({ appliedOnBookingId: bookingId, status: "PENDING" });
    if (!referral) return;

    referral.status = "REWARDED";
    await referral.save();

    await creditWalletAtomic(
      String(referral.referrerId),
      referral.rewardAmount,
      `REFERRAL_REWARD:${referral._id}`
    );

    console.log(`[Referral] ₹${referral.rewardAmount} credited to ${referral.referrerId} for booking ${bookingId}`);
  } catch (err) {
    console.error("[Referral] completeReferralReward error:", err);
  }
};

/** GET /api/referral/my-earnings — get referral ledger for logged in user */
export const getMyEarnings = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [total, referrals] = await Promise.all([
    Referral.countDocuments({ referrerId: userId }),
    Referral.find({ referrerId: userId })
      .populate("refereeId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
  ]);

  const totalEarned = await Referral.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(userId), status: "REWARDED" } },
    { $group: { _id: null, total: { $sum: "$rewardAmount" } } }
  ]);

  const totalPending = await Referral.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(userId), status: "PENDING" } },
    { $group: { _id: null, total: { $sum: "$rewardAmount" } } }
  ]);

  res.status(200).json(
    new ApiResponse(200, "Earnings fetched", {
      items: referrals,
      totalEarned: totalEarned[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0,
      totalRecords: total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  );
});

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

/** GET /api/referral/share-image?code=XYZ */
export const generateShareImage = asyncHandler(async (req, res) => {
  const code = req.query.code as string;
  if (!code) throw new ApiError(400, "Referral code is required");

  try {
    const bgPath = path.resolve(process.cwd(), "public", "a1care_referral_bg.jpg");
    const image = await Jimp.read(bgPath);
    
    // Load font (Jimp provides some built-in bitmap fonts)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    
    // Print the code on the image (centered roughly)
    image.print(
      font,
      0,
      0,
      {
        text: `Code: ${code.toUpperCase()}`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      },
      image.bitmap.width,
      image.bitmap.height
    );

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
    res.send(buffer);
  } catch (error) {
    console.error("[Referral] generateShareImage error:", error);
    throw new ApiError(500, "Failed to generate share image");
  }
});
