import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Coupon from "./coupon.model.js";

/** Internal: validate a coupon against all rules and compute the discount (no mutation). */
const evaluateCoupon = async (
  code: string,
  userId: string,
  orderAmount: number,
  bookingType: "SERVICE" | "DOCTOR"
) => {
  if (!code) throw new ApiError(400, "Coupon code is required");

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon) throw new ApiError(404, "Invalid coupon code");
  if (!coupon.isActive) throw new ApiError(400, "This coupon is no longer active");

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) throw new ApiError(400, "This coupon is not yet active");
  if (coupon.validTo && now > coupon.validTo) throw new ApiError(400, "This coupon has expired");

  if (coupon.applicableTo !== "ALL" && coupon.applicableTo !== bookingType) {
    throw new ApiError(400, `This coupon is only valid for ${coupon.applicableTo.toLowerCase()} bookings`);
  }
  if (orderAmount < (coupon.minOrderAmount || 0)) {
    throw new ApiError(400, `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`);
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, "This coupon has reached its usage limit");
  }
  const usedByUser = coupon.usedBy.filter((u: any) => u.userId?.toString() === userId?.toString()).length;
  if (usedByUser >= (coupon.usagePerUser || 1)) {
    throw new ApiError(400, "You have already used this coupon");
  }

  let discount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) discount = Math.min(discount, coupon.maxDiscountAmount);
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(Math.round(discount), orderAmount);
  return { coupon, discount };
};

/**
 * Validate a coupon WITHOUT consuming it. Call this BEFORE payment / booking save.
 * Returns the data needed to later consume it. Throws on any invalid condition.
 */
export const validateCoupon = async (
  code: string,
  userId: string,
  orderAmount: number,
  bookingType: "SERVICE" | "DOCTOR" = "SERVICE"
) => {
  const { coupon, discount } = await evaluateCoupon(code, userId, orderAmount, bookingType);
  return {
    couponId: String(coupon._id),
    couponCode: coupon.code,
    discountAmount: discount,
    usageLimit: coupon.usageLimit || 0,
    usagePerUser: coupon.usagePerUser || 1,
  };
};

/**
 * Atomically consume a coupon AFTER the booking is saved and payment is confirmed.
 * The atomic filter guards BOTH the total usage limit and the per-user limit so that
 * concurrent requests cannot push usage past either cap. Throws if the coupon can no
 * longer be consumed (e.g. limit reached in a race).
 */
export const consumeCoupon = async (
  couponId: string,
  userId: string,
  usageLimit = 0,
  usagePerUser = 1
) => {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const filter: any = { _id: couponId };
  if (usageLimit > 0) filter.usedCount = { $lt: usageLimit };
  // Per-user atomic guard: number of existing redemptions by this user must be < usagePerUser.
  filter.$expr = {
    $lt: [
      {
        $size: {
          $filter: {
            input: { $ifNull: ["$usedBy", []] },
            as: "u",
            cond: { $eq: ["$$u.userId", userObjId] },
          },
        },
      },
      usagePerUser,
    ],
  };

  const updated = await Coupon.findOneAndUpdate(
    filter,
    { $inc: { usedCount: 1 }, $push: { usedBy: { userId: userObjId, usedAt: new Date() } } },
    { new: true }
  );
  if (!updated) throw new ApiError(400, "This coupon can no longer be used");
  return updated;
};

/** Roll back a consumed coupon (e.g. when a later step in booking creation fails). */
export const rollbackCoupon = async (couponId: string, userId: string) => {
  try {
    const userObjId = new mongoose.Types.ObjectId(userId);
    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usedCount: -1 },
      $pull: { usedBy: { userId: userObjId } },
    });
  } catch (e) {
    console.error("[Coupon] rollback error:", e);
  }
};

/** Public — preview the discount for a coupon before booking (no consumption). */
export const previewCoupon = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { code, orderAmount, bookingType } = req.body;
  const { coupon, discount } = await evaluateCoupon(
    code,
    userId!,
    Number(orderAmount) || 0,
    (bookingType as any) || "SERVICE"
  );
  return res.status(200).json(
    new ApiResponse(200, "Coupon valid", {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      finalAmount: Math.max(0, (Number(orderAmount) || 0) - discount),
    })
  );
});

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export const createCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new ApiError(400, "Coupon code is required");

  // Validity-window sanity check
  if (req.body.validFrom && req.body.validTo && new Date(req.body.validTo) <= new Date(req.body.validFrom)) {
    throw new ApiError(400, "validTo must be after validFrom");
  }

  const normalized = String(code).toUpperCase().trim();
  const existing = await Coupon.findOne({ code: normalized });
  if (existing) throw new ApiError(409, "A coupon with this code already exists");
  const coupon = await Coupon.create({ ...req.body, code: normalized });
  return res.status(201).json(new ApiResponse(201, "Coupon created", coupon));
});

export const listCoupons = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Coupons fetched", {
      items: coupons,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    })
  );
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const update = { ...req.body };
  if (update.code) update.code = String(update.code).toUpperCase().trim();

  // Validity-window sanity check (use incoming values, falling back to stored ones)
  if (update.validFrom || update.validTo) {
    const current = await Coupon.findById(id).lean();
    if (!current) throw new ApiError(404, "Coupon not found");
    const from = new Date(update.validFrom ?? current.validFrom ?? 0);
    const to = update.validTo ?? current.validTo;
    if (to && new Date(to) <= from) {
      throw new ApiError(400, "validTo must be after validFrom");
    }
  }

  try {
    const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });
    if (!coupon) throw new ApiError(404, "Coupon not found");
    return res.status(200).json(new ApiResponse(200, "Coupon updated", coupon));
  } catch (err: any) {
    if (err?.code === 11000) throw new ApiError(409, "A coupon with this code already exists");
    throw err;
  }
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return res.status(200).json(new ApiResponse(200, "Coupon deleted", {}));
});
