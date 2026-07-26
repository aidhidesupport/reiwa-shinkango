import { describe, expect, it } from "vitest";
import {
  EMAIL_VERIFICATION_TTL_MS,
  createEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerificationTokenUsable,
} from "./email-verification";

describe("email verification tokens", () => {
  it("creates a random token and stores only its deterministic hash", () => {
    const now = new Date("2026-07-26T00:00:00.000Z");
    const first = createEmailVerificationToken(now);
    const second = createEmailVerificationToken(now);

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashEmailVerificationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.expiresAt.getTime()).toBe(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
  });

  it("rejects used and expired records", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    expect(isEmailVerificationTokenUsable({
      expiresAt: new Date("2026-07-27T00:00:01.000Z"),
      usedAt: null,
    }, now)).toBe(true);
    expect(isEmailVerificationTokenUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
    expect(isEmailVerificationTokenUsable({
      expiresAt: new Date("2026-07-28T00:00:00.000Z"),
      usedAt: new Date("2026-07-26T12:00:00.000Z"),
    }, now)).toBe(false);
  });
});
