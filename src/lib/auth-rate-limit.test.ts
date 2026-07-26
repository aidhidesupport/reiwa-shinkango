import { describe, expect, it } from "vitest";
import {
  clientAddressFromHeaders,
  getAuthRateLimitRule,
  hashRateLimitKey,
  rateLimitWindowStart,
} from "./auth-rate-limit";

describe("authentication rate limiting", () => {
  it("uses stricter account limits than IP limits", () => {
    expect(getAuthRateLimitRule("sign-in", "account")).toEqual({ limit: 10, windowSeconds: 900 });
    expect(getAuthRateLimitRule("sign-in", "ip")).toEqual({ limit: 50, windowSeconds: 900 });
    expect(getAuthRateLimitRule("sign-up", "account")).toEqual({ limit: 3, windowSeconds: 3600 });
    expect(getAuthRateLimitRule("password-reset-request", "account"))
      .toEqual({ limit: 3, windowSeconds: 3600 });
    expect(getAuthRateLimitRule("password-reset-complete", "ip"))
      .toEqual({ limit: 50, windowSeconds: 900 });
    expect(getAuthRateLimitRule("email-verification-resend", "account"))
      .toEqual({ limit: 3, windowSeconds: 3600 });
  });

  it("rounds timestamps to a stable fixed window", () => {
    expect(rateLimitWindowStart(new Date("2026-07-15T12:14:59.999Z"), 900).toISOString())
      .toBe("2026-07-15T12:00:00.000Z");
  });

  it("hashes identifiers without retaining their raw value", () => {
    const hash = hashRateLimitKey("account:user@example.com", "test-secret");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("user@example.com");
    expect(hash).toBe(hashRateLimitKey("account:user@example.com", "test-secret"));
  });

  it("prefers the Vercel-supplied client address", () => {
    const values = new Map([
      ["x-vercel-forwarded-for", "203.0.113.10, 10.0.0.1"],
      ["x-forwarded-for", "198.51.100.20"],
    ]);
    expect(clientAddressFromHeaders({ get: (name) => values.get(name) ?? null })).toBe("203.0.113.10");
  });
});
