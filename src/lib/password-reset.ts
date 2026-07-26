import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TTL_MINUTES = 30;
export const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
  };
}

export function isPasswordResetTokenUsable(
  record: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
) {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}

export function buildPasswordResetUrl(token: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteUrl = configuredSiteUrl || "http://localhost:3000";
  const url = new URL("/reset-password", siteUrl);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS for password reset.");
  }
  url.searchParams.set("token", token);
  return url.toString();
}
