import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "reiwa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_KEY_LENGTH = 64;
const LOCAL_SESSION_SECRET = "local-development-session-secret-change-me";
const MIN_SESSION_SECRET_LENGTH = 32;
const WEAK_SESSION_SECRETS = new Set([
  LOCAL_SESSION_SECRET,
  "replace-with-a-long-random-secret",
  "change-me",
  "secret",
]);

export type SessionPayload = {
  userId: string;
  sessionVersion: number;
  expiresAt: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function isWeakSessionSecret(secret: string | null | undefined) {
  const value = secret?.trim() ?? "";
  return value.length < MIN_SESSION_SECRET_LENGTH || WEAK_SESSION_SECRETS.has(value);
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && isWeakSessionSecret(secret)) {
    throw new Error("SESSION_SECRET must be set to a long random value in production.");
  }
  return secret ?? LOCAL_SESSION_SECRET;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string, sessionVersion = 0) {
  const payload: SessionPayload = {
    userId,
    sessionVersion,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(fromBase64url(encodedPayload)) as SessionPayload;
    if (!payload.userId || payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return {
      ...payload,
      sessionVersion: Number.isInteger(payload.sessionVersion) ? payload.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  const [algorithm, salt, stored] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !stored) return false;
  const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const storedBuffer = Buffer.from(stored, "hex");
  return derived.length === storedBuffer.length && timingSafeEqual(derived, storedBuffer);
}

export { SESSION_COOKIE };
