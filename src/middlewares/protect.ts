import type { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import RedisClient from "../configs/redisConnect.js";
import { Patient } from "../modules/Authentication/patient.model.js";
import DoctorModel from "../modules/Doctors/doctor.model.js";

/**
 * Resolve the user's current tokenVersion, cached in Redis for 60s so we don't hit
 * Mongo on every authenticated request. Returns null if the version can't be resolved
 * (infra error) — callers should fail-open in that case (7-day expiry is the backstop).
 */
async function getStoredTokenVersion(kind: "patient" | "staff", id: string): Promise<number | null> {
  const cacheKey = `tv:${kind}:${id}`;
  try {
    const cached = await RedisClient.get(cacheKey);
    if (cached !== null && cached !== undefined) return Number(cached);
  } catch {
    // Redis unavailable — fall through to DB.
  }

  let version: number | null = null;
  try {
    if (kind === "patient") {
      const p = await Patient.findById(id).select("tokenVersion").lean();
      if (!p) return null;
      version = (p as any).tokenVersion ?? 0;
    } else {
      const d = await DoctorModel.findById(id).select("tokenVersion").lean();
      if (!d) return null;
      version = (d as any).tokenVersion ?? 0;
    }
  } catch {
    return null; // DB error → fail-open
  }

  try {
    await RedisClient.setEx(cacheKey, 60, String(version));
  } catch {
    // best-effort cache write
  }
  return version;
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {

    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized: token missing");
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify & decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token as string, process.env.JWT_SECRET as string) as any;
    } catch (error) {
      throw new ApiError(401, "Unauthorized: invalid token");
    }

    const id = decoded.userId ?? decoded.staffId;
    if (!id) throw new ApiError(401, "Unauthorized: invalid token");

    // 3. Token-version check — lets admins revoke a session by bumping tokenVersion.
    // Fails open only on infra errors (stored version unresolved), never on a real mismatch.
    const kind: "patient" | "staff" = decoded.userId ? "patient" : "staff";
    const storedVersion = await getStoredTokenVersion(kind, String(id));
    if (storedVersion !== null && (decoded.tv ?? 0) !== storedVersion) {
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    // 4. Attach user and continue
    req.user = {
      id,
      role: decoded.userId ? 'Patient' : 'Staff'
    };
    next();
  }
);
