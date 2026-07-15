import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, isWeakSessionSecret, verifyPassword, verifySessionToken } from "./auth";

describe("auth helpers", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("strong-password");
    expect(hash).not.toContain("strong-password");
    expect(verifyPassword("strong-password", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("creates signed session tokens", () => {
    const token = createSessionToken("user_123", 3);
    expect(verifySessionToken(token)?.userId).toBe("user_123");
    expect(verifySessionToken(token)?.sessionVersion).toBe(3);
    expect(verifySessionToken(`${token}x`)).toBeNull();
  });

  it("detects weak production session secrets", () => {
    expect(isWeakSessionSecret(undefined)).toBe(true);
    expect(isWeakSessionSecret("replace-with-a-long-random-secret")).toBe(true);
    expect(isWeakSessionSecret("short")).toBe(true);
    expect(isWeakSessionSecret("a-long-random-session-secret-value-12345")).toBe(false);
  });
});
