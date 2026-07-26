import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessageSquareText,
  Quote,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { prisma } from "@/lib/prisma";
import { scoreProposal } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "令和新漢語",
    description: "横文字を文脈に合う日本語へ。日本語案と使用例を公開で推敲する場。",
    url: "/",
  },
};

export default async function HomePage() {
  const [termCount, proposalCount, exampleCount, recentProposals, recommendations] = await Promise.all([
    prisma.term.count({ where: { status: "published" } }),
    prisma.translationProposal.count({
      where: {
        status: { not: "hidden" },
        sense: { term: { status: "published" } },
      },
    }),
    prisma.usageExample.count({
      where: {
        status: { not: "hidden" },
        term: { status: "published" },
        OR: [
          { proposalId: null },
          { proposal: { status: { not: "hidden" } } },
        ],
      },
    }),
    prisma.translationProposal.findMany({
      where: {
        status: { not: "hidden" },
        sense: { term: { status: "published" } },
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: {
        evaluations: true,
        examples: { where: { status: { not: "hidden" } } },
        sense: {
          include: {
            term: true,
            domain: true,
            tags: { include: { tag: true } },
          },
        },
      },
    }),
    prisma.recommendation.findMany({
      where: {
        proposal: { status: { not: "hidden" } },
        sense: { term: { status: "published" } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        proposal: true,
        sense: {
          include: {
            term: true,
            domain: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="page-shell">
      <section className="top-band">
        <div className="top-copy">
          <p className="eyebrow">公開推敲型の横文字言い換え集</p>
          <h1>横文字を、文脈に合う日本語へ。</h1>
          <p>
            一語一訳で決めつけず、意味・分野・使用例ごとに日本語案を出し合って磨く場所です。
          </p>
        </div>
        <SearchBox autoFocus />
      </section>

      <section className="metric-row" aria-label="登録状況">
        <div>
          <strong>{termCount}</strong>
          <span>横文字項目</span>
        </div>
        <div>
          <strong>{proposalCount}</strong>
          <span>日本語案</span>
        </div>
        <div>
          <strong>{exampleCount}</strong>
          <span>使用例</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="content-column wide">
          <div className="section-heading home-recent-heading">
            <div>
              <p className="eyebrow">最近の追加・更新</p>
              <h2>新着の日本語案</h2>
            </div>
            <Link href="/terms/new" className="text-link">
              日本語案を投稿 <ArrowRight size={16} />
            </Link>
          </div>

          <div className="recent-proposal-list">
            {recentProposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`}
                className="recent-proposal-card"
              >
                <div className="recent-proposal-source">
                  <span>取り上げている言葉</span>
                  <strong>{proposal.sense.term.headword}</strong>
                  {proposal.sense.term.originalWord ? <small>{proposal.sense.term.originalWord}</small> : null}
                </div>
                <h3>{proposal.text}</h3>
                <div className="recent-proposal-context">
                  <strong>合う場面</strong>
                  <p>{proposal.fitContext}</p>
                </div>
                <div className="recent-proposal-taxonomy">
                  <span className="domain-chip">{proposal.sense.domain?.name ?? "未分類"}</span>
                  {proposal.sense.tags.slice(0, 3).map(({ tag }) => (
                    <span key={tag.id}>{tag.name}</span>
                  ))}
                </div>
                <div className="recent-proposal-metrics">
                  <span>
                    <BarChart3 size={14} />
                    参考スコア {scoreProposal(proposal)}
                  </span>
                  <span>
                    <Users size={14} />
                    評価 {proposal.evaluations.length}人
                  </span>
                  <span>
                    <Quote size={14} />
                    使用例 {proposal.examples.length}件
                  </span>
                </div>
                <span className="recent-proposal-link">
                  この案を詳しく見る
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))}
            {recentProposals.length === 0 ? (
              <div className="proposal-empty">
                <strong>日本語案はまだありません。</strong>
                <p>最初の日本語案を、合う場面と一緒に投稿できます。</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">整理済み</p>
              <h2>推奨する日本語案</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <Link
                key={recommendation.id}
                href={`/terms/${recommendation.sense.term.slug}#proposal-${recommendation.proposalId}`}
                className="recommendation-item"
              >
                <span>{recommendation.sense.term.headword}</span>
                <strong>{recommendation.proposal.text}</strong>
                <small>
                  {recommendation.sense.domain?.name ?? "未分類"} / {recommendation.context}
                </small>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="workflow-band">
        <div>
          <Search size={22} />
          <h2>探す</h2>
          <p>横文字や日本語案から項目を見つけます。</p>
        </div>
        <div>
          <MessageSquareText size={22} />
          <h2>試す</h2>
          <p>実際の文で置き換えて自然さを比べます。</p>
        </div>
        <div>
          <ShieldCheck size={22} />
          <h2>整理する</h2>
          <p>評価と議論をもとに、推奨する日本語案を残します。</p>
        </div>
      </section>
    </div>
  );
}
