import crypto from "crypto";

export function hmacHash(value:string) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET_TOKEN as string)
    .update(value)
    .digest("hex");
}
