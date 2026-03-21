import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Admin } from "../modules/Admin/admin.model.js";

const ENV_ADMIN_ID = "env-super-admin";

const hasEnvSuperAdmin = () => {
  return Boolean(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD);
};

export const protectAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized: token missing");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new ApiError(401, "Unauthorized: token missing");
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    throw new ApiError(401, "Unauthorized: invalid token");
  }

  if (!decoded?.adminId) {
    throw new ApiError(401, "Unauthorized: invalid admin token");
  }

  if (decoded.adminId === ENV_ADMIN_ID && decoded.role === "super_admin" && hasEnvSuperAdmin()) {
    req.user = {
      id: ENV_ADMIN_ID,
      role: "super_admin"
    };
    next();
    return;
  }

  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database unavailable: admin session validation failed");
  }

  const admin = await Admin.findById(decoded.adminId).lean();
  if (!admin || !admin.isActive) {
    throw new ApiError(401, "Unauthorized: admin not active");
  }

  req.user = {
    id: String(admin._id),
    role: admin.role
  };

  next();
});

export const requireAdminRole =
  (allowedRoles: Array<"admin" | "super_admin">) =>
    (req: Request, _res: Response, next: NextFunction) => {
      const role = req.user?.role;
      if (!role || !allowedRoles.includes(role as any)) {
        throw new ApiError(403, "Forbidden: insufficient permissions");
      }
      next();
    };
