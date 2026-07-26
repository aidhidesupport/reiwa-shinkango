import { NextResponse } from "next/server";
import { latestTestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expectedSecret = process.env.E2E_MAILBOX_SECRET;
  const providedSecret = request.headers.get("x-e2e-mailbox-secret");
  if (
    process.env.E2E_TEST_MODE !== "1"
    || !expectedSecret
    || providedSecret !== expectedSecret
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const to = url.searchParams.get("to")?.trim().toLowerCase() ?? "";
  const requestedKind = url.searchParams.get("kind");
  const kind = requestedKind === "email-verification" ? "email-verification" : "password-reset";
  const email = await latestTestEmail(to, kind);
  return NextResponse.json(
    { email },
    { headers: { "Cache-Control": "no-store" } },
  );
}
