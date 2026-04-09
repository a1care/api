// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "Patient" | "Staff" | "admin" | "super_admin";
        appType?: "user" | "partner" | "admin" | "super_admin";
        partnerType?: string | null;
      };
      fileUrl:string
    }
  }
}

export {};
