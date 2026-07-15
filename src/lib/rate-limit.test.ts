import { describe, expect, it } from "vitest";
import { getRateLimitPolicy } from "./rate-limit";

describe("getRateLimitPolicy", () => {
  it("uses conservative defaults", () => {
    expect(getRateLimitPolicy({})).toEqual({
      windowSeconds: 60,
      limits: { post: 12, comment: 12, report: 8 },
    });
  });

  it("accepts explicit production values", () => {
    expect(getRateLimitPolicy({
      RATE_LIMIT_WINDOW_SECONDS: "120",
      RATE_LIMIT_POSTS_PER_WINDOW: "6",
      RATE_LIMIT_COMMENTS_PER_WINDOW: "4",
      RATE_LIMIT_REPORTS_PER_WINDOW: "3",
    })).toEqual({
      windowSeconds: 120,
      limits: { post: 6, comment: 4, report: 3 },
    });
  });

  it("falls back when a value is invalid", () => {
    expect(getRateLimitPolicy({
      RATE_LIMIT_WINDOW_SECONDS: "0",
      RATE_LIMIT_POSTS_PER_WINDOW: "many",
      RATE_LIMIT_COMMENTS_PER_WINDOW: "-1",
      RATE_LIMIT_REPORTS_PER_WINDOW: "2.5",
    })).toEqual({
      windowSeconds: 60,
      limits: { post: 12, comment: 12, report: 8 },
    });
  });
});
