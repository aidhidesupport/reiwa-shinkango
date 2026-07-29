import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AlertTriangle, Clock3, History, Plus, Tag } from "lucide-react";
import { reportTermWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { AddProposalForm, AddSenseForm, EditSenseForm } from "@/components/TermForms";
import { ProposalCard } from "@/components/ProposalCard";
import { RecommendationWorkbench } from "@/components/RecommendationWorkbench";
import { ShareButton } from "@/components/ShareButton";
import { canEditContent, canEditRecommendations, canModerate, getCurrentUser } from "@/lib/session";
import { sortedByProposalScore } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import { decodePathSegment } from "@/lib/routing";

type TermPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ merged?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TermPageProps) {
  const rawParams = await params;
  const slug = decodePathSegment(rawParams.slug);
  const term = await prisma.term.findUnique({ where: { slug } });
  if (!term) {
    const termRedirect = await prisma.termRedirect.findUnique({
      where: { sourceSlug: slug },
      include: { targetTerm: true },
    });
    if (termRedirect) {
      const imageUrl = `/share/terms/${encodeURIComponent(termRedirect.targetTerm.slug)}`;
      return {
        title: `${termRedirect.targetTerm.headword}の日本語案・言い換え`,
        description: termRedirect.targetTerm.summary,
        alternates: {
          canonical: `/terms/${termRedirect.targetTerm.slug}`,
        },
        openGraph: {
          type: "article",
          locale: "ja_JP",
          siteName: "令和新漢語",
          title: `${termRedirect.targetTerm.headword}の日本語案・言い換え`,
          description: termRedirect.targetTerm.summary,
          url: `/terms/${termRedirect.targetTerm.slug}`,
          images: [{
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${termRedirect.targetTerm.headword}の日本語案`,
          }],
        },
        twitter: {
          card: "summary_large_image",
          title: `${termRedirect.targetTerm.headword}の日本語案・言い換え`,
          description: termRedirect.targetTerm.summary,
          images: [imageUrl],
        },
      };
    }
  }
  const imageUrl = term ? `/share/terms/${encodeURIComponent(term.slug)}` : undefined;
  return {
    title: term?.status === "published" ? `${term.headword}の日本語案・言い換え` : "項目",
    description: term?.status === "published" ? term.summary : undefined,
    alternates: term?.status === "published" ? {
      canonical: `/terms/${term.slug}`,
    } : undefined,
    openGraph: term?.status === "published" ? {
      type: "article",
      locale: "ja_JP",
      siteName: "令和新漢語",
      title: `${term.headword}の日本語案・言い換え`,
      description: term.summary,
      url: `/terms/${term.slug}`,
      images: [{
        url: imageUrl!,
        width: 1200,
        height: 630,
        alt: `${term.headword}の日本語案`,
      }],
    } : undefined,
    twitter: term?.status === "published" ? {
      card: "summary_large_image",
      title: `${term.headword}の日本語案・言い換え`,
      description: term.summary,
      images: [imageUrl!],
    } : undefined,
    robots: term?.status === "published" ? undefined : {
      index: false,
      follow: false,
    },
  };
}

export default async function TermPage({ params, searchParams }: TermPageProps) {
  const [rawParams, query] = await Promise.all([params, searchParams]);
  const slug = decodePathSegment(rawParams.slug);
  const [term, domains, currentUser] = await Promise.all([
    prisma.term.findUnique({
      where: { slug },
      include: {
        createdBy: true,
        senses: {
          orderBy: { order: "asc" },
          include: {
            domain: true,
            tags: { include: { tag: true } },
            recommendations: {
              where: {
                proposal: { status: { not: "hidden" } },
              },
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

  if (!term) {
    const termRedirect = await prisma.termRedirect.findUnique({
      where: { sourceSlug: slug },
      include: { targetTerm: { select: { slug: true } } },
    });
    if (termRedirect) {
      permanentRedirect(`/terms/${encodeURIComponent(termRedirect.targetTerm.slug)}`);
    }
    notFound();
  }
  const canSeeHidden = currentUser ? canModerate(currentUser.role) : false;
  if (term.status !== "published" && !canSeeHidden) {
    notFound();
  }
  const participatingUser = currentUser?.emailVerifiedAt ? currentUser : null;
  const summaryRepeatsSense = term.senses.some(
    (sense) => sense.description.trim() === term.summary.trim(),
  );

  return (
    <div className="page-shell">
      {query.merged ? (
        <p className="notice success">重複項目を統合しました。使われ方、日本語案、使用例、関連履歴をこの項目へ移しました。</p>
      ) : null}
      {term.status === "hidden" ? (
        <p className="notice warning">この項目は非公開中です。編集者だけが内容を確認できます。</p>
      ) : null}
      {currentUser && !currentUser.emailVerifiedAt ? (
        <p className="notice warning">
          投稿、評価、コメントへ参加するには、<Link href="/account">メールアドレスを確認</Link>してください。
        </p>
      ) : null}
      <section className="term-hero">
        <div>
          <div className="term-title-line">
            <h1>{term.headword}</h1>
            {term.originalWord ? <span>{term.originalWord}</span> : null}
          </div>
          {summaryRepeatsSense ? null : <p>{term.summary}</p>}
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
          <ShareButton
            title={`${term.headword}の日本語案・言い換え | 令和新漢語`}
            text={`「${term.headword}」を、日本語でどう表しますか？意味と使用例から造語案を比べられます。`}
          />
          {participatingUser ? (
            <details className="report-details term-report">
              <summary>
                <AlertTriangle size={15} />
                通報
              </summary>
              <ActionForm action={reportTermWithState} className="inline-form" pendingMessage="通報しています…">
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
              </ActionForm>
            </details>
          ) : null}
        </div>
      </section>

      <section className="recommendation-summary">
        <h2>編集部の推奨日本語案</h2>
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
            <p className="muted">推奨する日本語案はまだ整理中です。各カードの合う場面や言い換え例を参考に比較してください。</p>
          ) : null}
        </div>
      </section>

      <div className="term-layout">
        <section className="sense-list">
          {term.senses.map((sense) => {
            const proposals = sortedByProposalScore(
              (canSeeHidden ? sense.proposals : sense.proposals.filter((proposal) => proposal.status !== "hidden"))
                .map((proposal) => ({
                  ...proposal,
                  examples: canSeeHidden
                    ? proposal.examples
                    : proposal.examples.filter((example) => example.status !== "hidden"),
                  comments: canSeeHidden
                    ? proposal.comments
                    : proposal.comments.filter((comment) => comment.status !== "hidden"),
                })),
            );
            return (
              <section key={sense.id} id={`sense-${sense.id}`} className="sense-section">
                <div className="section-heading">
                  <div>
                    <div className="tag-row sense-classification" aria-label="分類">
                      {sense.domain ? (
                        <Link className="domain-chip" href={`/domains/${sense.domain.slug}`}>
                          {sense.domain.name}
                        </Link>
                      ) : (
                        <span className="domain-chip">未分類</span>
                      )}
                      {sense.tags.map(({ tag }) => (
                        <Link key={tag.id} href={`/search?q=${encodeURIComponent(tag.name)}`}>
                          <Tag size={14} />
                          {tag.name}
                        </Link>
                      ))}
                    </div>
                    <h2>{sense.title}</h2>
                  </div>
                </div>
                <p>{sense.description}</p>
                {sense.usageNote ? <p className="muted">用法メモ: {sense.usageNote}</p> : null}

                {participatingUser ? (
                  <EditSenseForm
                    sense={sense}
                    termSlug={term.slug}
                    domains={domains}
                    canApplyNow={canEditContent(participatingUser.role)}
                  />
                ) : null}

                <div className="proposal-list-heading">
                  <div>
                    <p className="eyebrow">日本語案</p>
                    <h3>{proposals.length}案を比較</h3>
                  </div>
                  {proposals.length > 1 ? <p>評価と使用例をもとに、参考スコア順で表示しています。</p> : null}
                </div>

                {participatingUser && canEditRecommendations(participatingUser.role) ? (
                  <RecommendationWorkbench
                    senseId={sense.id}
                    termSlug={term.slug}
                    proposals={proposals.filter((proposal) => proposal.status !== "hidden")}
                  />
                ) : null}

                {proposals.length > 0 ? (
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
                ) : (
                  <div className="proposal-empty">
                    <strong>この使われ方に合う日本語案は、まだありません。</strong>
                    <p>
                      実際に言い換えとして使える短い案を、合う場面や理由と一緒に追加できます。
                    </p>
                  </div>
                )}

                {participatingUser ? (
                  <AddProposalForm termId={term.id} termSlug={term.slug} senseId={sense.id} />
                ) : (
                  <Link
                    href={currentUser ? "/account" : `/login?returnTo=/terms/${term.slug}`}
                    className="button secondary"
                  >
                    <Plus size={17} />
                    <span>{currentUser ? "メール確認後に日本語案を追加" : "ログインして日本語案を追加"}</span>
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
          {participatingUser ? (
            <AddSenseForm termId={term.id} termSlug={term.slug} domains={domains} />
          ) : (
            <Link href={currentUser ? "/account" : `/login?returnTo=/terms/${term.slug}`} className="text-link">
              {currentUser ? "メール確認後に編集へ参加" : "ログインして編集に参加"}
            </Link>
          )}
          <div className="note-box">
            <strong>投稿の目安</strong>
            <p>日本語案に元文と言い換え文を添えると、使いやすさを評価しやすくなります。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
