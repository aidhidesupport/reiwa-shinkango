import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const baseEnvironment = {
  DATABASE_URL: "postgresql://prisma.project:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://prisma.project:migration-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  SESSION_SECRET: "a-unique-session-secret-that-is-more-than-32-characters",
  NEXT_PUBLIC_SITE_URL: "https://reiwa-shinkango.vercel.app",
  ADMIN_EMAIL: "owner@real-domain.jp",
  ADMIN_PASSWORD: "a-unique-admin-password-2026",
  CONTACT_EMAIL: "contact@real-domain.jp",
  OPERATOR_NAME: "令和新漢語運営事務局",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "contact@real-domain.jp",
  SMTP_PASSWORD: "a-real-app-password",
  EMAIL_FROM: "令和新漢語 <contact@real-domain.jp>",
  DATA_LICENSE: "site-only",
  RATE_LIMIT_WINDOW_SECONDS: "60",
  RATE_LIMIT_POSTS_PER_WINDOW: "12",
  RATE_LIMIT_COMMENTS_PER_WINDOW: "12",
  RATE_LIMIT_REPORTS_PER_WINDOW: "8",
};

function runCheck(overrides = {}) {
  return spawnSync(process.execPath, ["scripts/check-production-env.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      ...baseEnvironment,
      ...overrides,
    },
  });
}

test("accepts a complete Supabase and Vercel production configuration", () => {
  const result = runCheck();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Production environment check passed/);
});

test("rejects a public URL with a path or query string", () => {
  const result = runCheck({
    NEXT_PUBLIC_SITE_URL: "https://reiwa-shinkango.vercel.app/private?token=value",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not contain a path/);
  assert.match(result.stderr, /without credentials, query parameters, or a fragment/);
});

test("rejects Supabase transaction mode as the migration connection", () => {
  const result = runCheck({
    DIRECT_URL: "postgresql://prisma.project:migration-secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DIRECT_URL must not use Supabase transaction mode/);
});

test("rejects placeholder database credentials and weak secrets", () => {
  const result = runCheck({
    DATABASE_URL: "postgresql://placeholder:placeholder@database.example.jp:5432/postgres",
    SESSION_SECRET: "change-me",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL must not contain placeholder credentials/);
  assert.match(result.stderr, /SESSION_SECRET must be a unique random value/);
});
