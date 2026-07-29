import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { decodePathSegment } from "@/lib/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug: rawSlug } = await params;
  const slug = decodePathSegment(rawSlug);
  const term = await prisma.term.findUnique({
    where: { slug, status: "published" },
    include: {
      senses: {
        orderBy: { order: "asc" },
        include: {
          recommendations: {
            select: { proposalId: true },
          },
          proposals: {
            where: { status: { not: "hidden" } },
            orderBy: { updatedAt: "desc" },
            include: {
              examples: {
                where: { status: { not: "hidden" } },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!term) {
    return new Response("項目が見つかりません。", { status: 404 });
  }

  const sense = term.senses.find((candidate) => candidate.proposals.length > 0);
  const recommendedIds = new Set(sense?.recommendations.map(({ proposalId }) => proposalId) ?? []);
  const proposals = [...(sense?.proposals ?? [])]
    .sort((a, b) => Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id)))
    .slice(0, 3);
  const featuredProposal = proposals[0];
  const example = featuredProposal?.examples[0];

  return new ImageResponse(
    (
      <div
        lang="ja"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "58px 64px 48px",
          background: "linear-gradient(135deg, #fffdfa 0%, #f2eee5 58%, #dcefeb 100%)",
          color: "#25211b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "850px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "#0f6b61",
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              令和新漢語・公開造語所
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                marginTop: "24px",
                fontSize: "66px",
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {term.headword}
            </div>
            {term.originalWord ? (
              <div
                style={{
                  display: "flex",
                  marginTop: "10px",
                  color: "#6e665b",
                  fontSize: "25px",
                  letterSpacing: "0.04em",
                }}
              >
                {term.originalWord}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              padding: "13px 18px",
              border: "2px solid #0f6b61",
              borderRadius: "999px",
              color: "#0f6b61",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            日本語案を比べる
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              maxHeight: "72px",
              overflow: "hidden",
              color: "#554e44",
              fontSize: "25px",
              lineHeight: 1.45,
            }}
          >
            {term.summary}
          </div>

          {proposals.length > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "24px",
                padding: "20px 24px",
                borderLeft: "7px solid #0f6b61",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.78)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexShrink: 0,
                  marginRight: "22px",
                  color: "#0f6b61",
                  fontSize: "20px",
                  fontWeight: 800,
                }}
              >
                日本語案
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  color: "#25211b",
                  fontSize: "33px",
                  fontWeight: 850,
                }}
              >
                {proposals.map((proposal, index) => (
                  <span key={proposal.id} style={{ display: "flex" }}>
                    {index > 0 ? <span style={{ display: "flex", margin: "0 14px", color: "#b9ad9d" }}>／</span> : null}
                    {proposal.text}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {example ? (
            <div
              style={{
                display: "flex",
                marginTop: "18px",
                color: "#554e44",
                fontSize: "20px",
              }}
            >
              <span style={{ display: "flex", marginRight: "12px", color: "#0f6b61", fontWeight: 800 }}>
                文で試す
              </span>
              <span style={{ display: "flex" }}>{example.rewrittenSentence}</span>
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
