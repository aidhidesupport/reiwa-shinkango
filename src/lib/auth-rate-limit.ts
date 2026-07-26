import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";

export type AuthRateLimitKind =
  | "sign-in"
  | "sign-up"
  | "email-verification-resend"
  | "email-verification-complete"
  | "password-reset-request"
  | "password-reset-complete";
export type AuthRateLimitScope = "account" | "ip";

type AuthRateLimitRule = {
  limit: number;
  windowSeconds: number;
};

const AUTH_RATE_LIMITS: Record<AuthRateLimitKind, Record<AuthRateLimitScope, AuthRateLimitRule>> = {
  "sign-in": {
    account: { limit: 10, windowSeconds: 15 * 60 },
    ip: { limit: 50, windowSeconds: 15 * 60 },
  },
  "sign-up": {
    account: { limit: 3, windowSeconds: 60 * 60 },
    ip: { limit: 10, windowSeconds: 60 * 60 },
  },
  "email-verification-resend": {
    account: { limit: 3, windowSeconds: 60 * 60 },
    ip: { limit: 20, windowSeconds: 60 * 60 },
  },
  "email-verification-complete": {
    account: { limit: 10, windowSeconds: 15 * 60 },
    ip: { limit: 50, windowSeconds: 15 * 60 },
  },
  "password-reset-request": {
    account: { limit: 3, windowSeconds: 60 * 60 },
    ip: { limit: 20, windowSeconds: 60 * 60 },
  },
  "password-reset-complete": {
    account: { limit: 10, windowSeconds: 15 * 60 },
    ip: { limit: 50, windowSeconds: 15 * 60 },
  },
};

type HeaderReader = {
  get(name: string): string | null;
};

export function getAuthRateLimitRule(kind: AuthRateLimitKind, scope: AuthRateLimitScope) {
  return AUTH_RATE_LIMITS[kind][scope];
}

export function rateLimitWindowStart(now: Date, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export function hashRateLimitKey(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function clientAddressFromHeaders(headerStore: HeaderReader) {
  const vercelForwardedFor = headerStore.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return vercelForwardedFor || forwardedFor || headerStore.get("x-real-ip")?.trim() || "unknown";
}

function rateLimitSecret() {
  return process.env.SESSION_SECRET || "local-auth-rate-limit-secret";
}

async function consumeBucket({
  kind,
  scope,
  value,
  now,
}: {
  kind: AuthRateLimitKind;
  scope: AuthRateLimitScope;
  value: string;
  now: Date;
}) {
  const rule = getAuthRateLimitRule(kind, scope);
  const windowStart = rateLimitWindowStart(now, rule.windowSeconds);
  const expiresAt = new Date(windowStart.getTime() + rule.windowSeconds * 2000);
  const bucketKind = `${kind}:${scope}`;
  const keyHash = hashRateLimitKey(`${scope}:${value}`, rateLimitSecret());
  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      kind_keyHash_windowStart: {
        kind: bucketKind,
        keyHash,
        windowStart,
      },
    },
    create: {
      kind: bucketKind,
      keyHash,
      windowStart,
      expiresAt,
    },
    update: {
      count: { increment: 1 },
      expiresAt,
    },
    select: { count: true },
  });
  return bucket.count <= rule.limit;
}

export async function enforceAuthRateLimit(kind: AuthRateLimitKind, normalizedEmail: string) {
  const headerStore = await headers();
  const ipAddress = clientAddressFromHeaders(headerStore);
  const now = new Date();
  const ipAllowed = await consumeBucket({ kind, scope: "ip", value: ipAddress, now });
  const accountAllowed = ipAllowed
    ? await consumeBucket({ kind, scope: "account", value: normalizedEmail, now })
    : false;

  if (Math.random() < 0.02) {
    await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => undefined);
  }

  if (ipAllowed && accountAllowed) return;
  if (kind === "sign-in") {
    throw new Error("ログイン試行が多すぎます。15分ほど時間をおいてください。");
  }
  if (kind === "email-verification-resend") {
    throw new Error("確認メールの再送が多すぎます。時間をおいてください。");
  }
  if (kind === "email-verification-complete" || kind.startsWith("password-reset")) {
    throw new Error("確認の試行が多すぎます。時間をおいてください。");
  }
  throw new Error("短時間のアカウント登録が多すぎます。1時間ほど時間をおいてください。");
}
