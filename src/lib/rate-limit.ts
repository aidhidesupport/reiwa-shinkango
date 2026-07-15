export type RateLimitKind = "post" | "comment" | "report";

export type RateLimitPolicy = {
  windowSeconds: number;
  limits: Record<RateLimitKind, number>;
};

const DEFAULT_POLICY: RateLimitPolicy = {
  windowSeconds: 60,
  limits: {
    post: 12,
    comment: 12,
    report: 8,
  },
};

function positiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRateLimitPolicy(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RateLimitPolicy {
  return {
    windowSeconds: positiveInteger(environment.RATE_LIMIT_WINDOW_SECONDS, DEFAULT_POLICY.windowSeconds),
    limits: {
      post: positiveInteger(environment.RATE_LIMIT_POSTS_PER_WINDOW, DEFAULT_POLICY.limits.post),
      comment: positiveInteger(environment.RATE_LIMIT_COMMENTS_PER_WINDOW, DEFAULT_POLICY.limits.comment),
      report: positiveInteger(environment.RATE_LIMIT_REPORTS_PER_WINDOW, DEFAULT_POLICY.limits.report),
    },
  };
}
