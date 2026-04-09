import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "super_admin"])
});

export const updateAdminRoleSchema = z.object({
  role: z.enum(["admin", "super_admin"])
});

