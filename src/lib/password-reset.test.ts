import { describe, expect, it } from "vitest";
import {
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
} from "./password-reset";

describe("password reset tokens", () => {
  it("creates a random token and stores only its deterministic hash", () => {
    const now = new Date("2026-07-26T00:00:00.000Z");
    const first = createPasswordResetToken(now);
    const second = createPasswordResetToken(now);

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashPasswordResetToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.expiresAt.getTime()).toBe(now.getTime() + PASSWORD_RESET_TTL_MS);
  });

  it("rejects used and expired records", () => {
    const now = new Date("2026-07-26T00:30:00.000Z");

    expect(isPasswordResetTokenUsable({
      expiresAt: new Date("2026-07-26T00:30:01.000Z"),
      usedAt: null,
    }, now)).toBe(true);
    expect(isPasswordResetTokenUsable({
      expiresAt: now,
      usedAt: null,
    }, now)).toBe(false);
    expect(isPasswordResetTokenUsable({
      expiresAt: new Date("2026-07-26T01:00:00.000Z"),
      usedAt: new Date("2026-07-26T00:20:00.000Z"),
    }, now)).toBe(false);
  });
});
