import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

function compare(first, second) {
  return execFileSync(process.execPath, ["scripts/postgres-target.mjs", first, second], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

test("treats query-only changes on the same database as the same target", () => {
  assert.equal(
    compare(
      "postgresql://app:one@database.example.jp:5432/reiwa?sslmode=require",
      "postgresql://app:two@database.example.jp:5432/reiwa?connect_timeout=10",
    ),
    "same",
  );
});

test("recognizes Supabase transaction and session poolers for one project", () => {
  assert.equal(
    compare(
      "postgresql://prisma.project-ref:one@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
      "postgresql://prisma.project-ref:two@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
    ),
    "same",
  );
});

test("allows a distinct database", () => {
  assert.equal(
    compare(
      "postgresql://app:one@database.example.jp:5432/reiwa",
      "postgresql://app:one@database.example.jp:5432/reiwa_restore",
    ),
    "different",
  );
});
