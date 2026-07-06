import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Clock3, History, Plus, Tag } from "lucide-react";
import { reportTerm } from "@/app/actions";
import { AddProposalForm, AddSenseForm } from "@/components/TermForms";
import { ProposalCard } from "@/components/ProposalCard";
import { canModerate, getCurrentUser } from "@/lib/session";
import { sortedByProposalScore } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

type TermPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TermPageProps) {
  const { slug } = await params;
  const term = await prisma.term.findUnique({ where: { slug } });
  return {
    title: term ? `${term.headword}の日本語訳・言い換え` : "項目",
    description: term?.summary,
  };
}

export default async function TermPage({ params }: TermPageProps) {
  const { slug } = await params;
  const [term, domains, currentUser] = await Promise.all([
    prisma.term.findUnique({
      where: { slug },
      include: {
        createdBy: true,
        tags: { include: { tag: true } },
        senses: {
          orderBy: { order: "asc" },
          include: {
            domain: true,
            recommendations: {
              include: {
                proposal: true,
              },
              orderBy: { updatedAt: "desc" },
            },
            proposals: {
              include: {
                createdBy: true,
                examples: true,
                evaluations: true,
                comments: {
                  include: { user: true },
                  orderBy: { createdAt: "desc" },
                },
                recommendations: {
                  orderBy: { updatedAt: "asc" },
                },
              },
            },
          },
        },
      },
    }),
    prisma.domain.findMany({ orderBy: { name: "asc" } }),
    getCurrentUser(),
  ]);

  if (!term) notFound();
  const canSeeHidden = currentUser ? canModerate(currentUser.role) : false;

  return (
    <div className="page-shell">
      <section className="term-hero">
        <div>
          <div className="term-title-line">
            <h1>{term.headword}</h1>
            {term.originalWord ? <span>{term.originalWord}</span> : null}
          </div>
          <p>{term.summary}</p>
          <div className="tag-row">
            {term.tags.map(({ tag }) => (
              <Link key={tag.id} href={`/search?q=${encodeURIComponent(tag.name)}`}>
                <Tag size={14} />
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="term-meta">
          <span>
            <Clock3 size={15} />
            {term.updatedAt.toLocaleDateString("ja-JP")}
          </span>
          <Link href={`/terms/${term.slug}/history`}>
            <History size={15} />
            変更履歴
          </Link>
          {currentUser ? (
            <details className="report-details term-report">
              <summary>
                <AlertTriangle size={15} />
                通報
              </summary>
              <form action={reportTerm} className="inline-form">
                <input type="hidden" name="termId" value={term.id} />
                <input type="hidden" name="termSlug" value={term.slug} />
                <select name="reason" defaultValue="meaning_error" aria-label="通報理由">
                  <option value="meaning_error">意味の誤り</option>
                  <option value="duplicate">重複</option>
                  <option value="abuse">攻撃的</option>
                  <option value="copyright">権利問題</option>
                  <option value="other">その他</option>
                </select>
                <input name="detail" placeholder="補足" />
                <button type="submit">送信</button>
              </form>
            </details>
          ) : null}
        </div>
      </section>

      <section className="recommendation-summary">
        <h2>文脈別推奨</h2>
        <div className="recommendation-grid">
          {term.senses.flatMap((sense) =>
            sense.recommendations.map((recommendation) => (
              <Link
                key={recommendation.id}
                href={`#proposal-${recommendation.proposalId}`}
                className={`recommendation-tile level-${recommendation.level}`}
              >
                <span>{sense.domain?.name ?? "未分類"} / {recommendation.context}</span>
                <strong>{recommendation.proposal.text}</strong>
                <p>{recommendation.rationale}</p>
              </Link>
            )),
          )}
          {term.senses.every((sense) => sense.recommendations.length === 0) ? (
            <p className="muted">推奨訳はまだ設定されていません。</p>
          ) : null}
        </div>
      </section>

      <div className="term-layout">
        <section className="sense-list">
          {term.senses.map((sense) => {
            const proposals = sortedByProposalScore(
              canSeeHidden ? sense.proposals : sense.proposals.filter((proposal) => proposal.status !== "hidden"),
            );
            return (
              <section key={sense.id} className="sense-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{sense.domain?.name ?? "未分類"}</p>
                    <h2>{sense.title}</h2>
                  </div>
                </div>
                <p>{sense.description}</p>

                <div className="proposal-list">
                  {proposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      termId={term.id}
                      termSlug={term.slug}
                      senseId={sense.id}
                      proposal={proposal}
                      currentUser={currentUser}
                    />
                  ))}
                </div>

                {currentUser ? (
                  <AddProposalForm termId={term.id} termSlug={term.slug} senseId={sense.id} />
                ) : (
                  <Link href={`/login?returnTo=/terms/${term.slug}`} className="button secondary">
                    <Plus size={17} />
                    <span>ログインして訳語案を追加</span>
                  </Link>
                )}
              </section>
            );
          })}
        </section>

        <aside className="side-panel">
          <h2>
            <Plus size={18} />
            項目を育てる
          </h2>
          {currentUser ? (
            <AddSenseForm termId={term.id} termSlug={term.slug} domains={domains} />
          ) : (
            <Link href={`/login?returnTo=/terms/${term.slug}`} className="text-link">
              ログインして編集に参加
            </Link>
          )}
          <div className="note-box">
            <strong>投稿の目安</strong>
            <p>訳語案だけでなく、元文と言い換え文を添えると評価されやすくなります。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
