import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
       databaseLatencyMs: Math.round(performance.now() - startedAt),
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "database unavailable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex",
        },
      },
    );
  }
}
