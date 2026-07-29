import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  GitBranch,
  MessageSquareText,
  Quote,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { featureArticles } from "@/lib/articles";
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
    title: "令和新漢語｜現代のための公開造語所",
    description: "新しい概念を、日本語で考えられる言葉へ。造語案を意味・語族・使用例から公開で育てます。",
    url: "/",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "令和新漢語｜現代のための公開造語所",
    description: "新しい概念を、日本語で考えられる言葉へ。造語案を意味・語族・使用例から公開で育てます。",
    images: ["/og.png"],
  },
};

export default async function HomePage() {
  const latestArticle = featureArticles[0];
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
          <p className="eyebrow">現代のための公開造語所</p>
          <h1>新しい概念を、日本語で考えられる言葉へ。</h1>
          <p>
            外来語を追い出すのではなく、意味を担い、関連する語を生み、
            実際の文章で使える日本語をつくる。造語の理由と試用結果を公開し、
            みんなで言葉を育てます。
          </p>
          <div className="top-actions">
            <Link href="/vision" className="button">
              活動理念を読む <ArrowRight size={17} />
            </Link>
            <Link href="/terms/engagement" className="button secondary">
              一語を見てみる
            </Link>
          </div>
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

      <section className="featured-cluster">
        <div className="featured-cluster-copy">
          <p className="eyebrow"><Sparkles size={14} /> {latestArticle.series}</p>
          <h2>{latestArticle.title}</h2>
          <p>{latestArticle.summary}</p>
        </div>
        <div className="featured-cluster-actions">
          <div aria-label={`${latestArticle.title}の要点`}>
            {latestArticle.previewItems.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="featured-cluster-links">
            <Link href={latestArticle.href} className="button">
              {latestArticle.cta} <ArrowRight size={17} />
            </Link>
            <Link href="/features" className="text-link">
              過去の記事を見る <ArrowRight size={16} />
            </Link>
          </div>
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
          <BookOpenText size={22} />
          <h2>意味を調べる</h2>
          <p>原語の意味と使われ方を分け、概念の輪郭を確かめます。</p>
        </div>
        <div>
          <GitBranch size={22} />
          <h2>言葉を造る</h2>
          <p>一語だけでなく、関連語へ自然に広がる日本語案を考えます。</p>
        </div>
        <div>
          <MessageSquareText size={22} />
          <h2>文で試す</h2>
          <p>文章や会話で使い、分かりやすさと精確さを検証します。</p>
        </div>
      </section>
    </div>
  );
}
