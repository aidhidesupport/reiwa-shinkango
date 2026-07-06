import Link from "next/link";
import { ArrowRight, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [termCount, proposalCount, exampleCount, recentTerms, recommendations] = await Promise.all([
    prisma.term.count(),
    prisma.translationProposal.count(),
    prisma.usageExample.count(),
    prisma.term.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        senses: {
          take: 1,
          include: {
            proposals: {
              take: 2,
              where: { status: { in: ["recommended", "limited", "tentative"] } },
            },
          },
        },
      },
    }),
    prisma.recommendation.findMany({
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
            一語一訳で決めつけず、意味・分野・使用例ごとに訳語案を出し合って磨く場所です。
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
          <span>訳語案</span>
        </div>
        <div>
          <strong>{exampleCount}</strong>
          <span>使用例</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="content-column wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">最近の項目</p>
              <h2>横文字一覧</h2>
            </div>
            <Link href="/terms/new" className="text-link">
              投稿する <ArrowRight size={16} />
            </Link>
          </div>

          <div className="term-list">
            {recentTerms.map((term) => (
              <Link key={term.id} href={`/terms/${term.slug}`} className="term-card">
                <div className="term-card-head">
                  <h3>{term.headword}</h3>
                  {term.originalWord ? <span>{term.originalWord}</span> : null}
                </div>
                <p>{term.summary}</p>
                <div className="tag-row">
                  {term.tags.map(({ tag }) => (
                    <span key={tag.id}>{tag.name}</span>
                  ))}
                </div>
                <div className="mini-proposals">
                  {term.senses.flatMap((sense) => sense.proposals).map((proposal) => (
                    <span key={proposal.id}>{proposal.text}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">整理済み</p>
              <h2>推奨訳</h2>
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
          <p>横文字や訳語案から項目を見つけます。</p>
        </div>
        <div>
          <MessageSquareText size={22} />
          <h2>試す</h2>
          <p>実際の文で置き換えて自然さを比べます。</p>
        </div>
        <div>
          <ShieldCheck size={22} />
          <h2>整理する</h2>
          <p>評価と議論をもとに推奨訳を残します。</p>
        </div>
      </section>
    </div>
  );
}
