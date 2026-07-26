import { createHash, randomBytes } from "node:crypto";

export const EMAIL_VERIFICATION_TTL_HOURS = 24;
export const EMAIL_VERIFICATION_TTL_MS = EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000;

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function isEmailVerificationTokenUsable(
  record: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
) {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}

export function buildEmailVerificationUrl(token: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteUrl = configuredSiteUrl || "http://localhost:3000";
  const url = new URL("/verify-email", siteUrl);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS for email verification.");
  }
  url.searchParams.set("token", token);
  return url.toString();
}
