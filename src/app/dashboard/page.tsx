import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, EyeOff, Gauge, GitMerge, MessageSquare, ShieldCheck } from "lucide-react";
import { hideProposal, resolveReport, setRecommendation } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { RECOMMENDATION_LEVELS } from "@/lib/labels";
import { getCurrentUser, canEditRecommendations } from "@/lib/session";
import { countLabels, scoreProposal } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "編集者ダッシュボード",
};

export const dynamic = "force-dynamic";

const positiveLabels = ["natural", "clear", "concise", "accurate", "document_friendly", "conversation_friendly"];
const negativeLabels = ["too_stiff", "too_long", "meaning_shift", "old_fashioned", "too_coined"];

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canEditRecommendations(currentUser.role)) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="整理画面は編集者専用です"
          body="推奨訳の確定、通報対応、非表示処理は編集者または管理者だけが行えます。"
          actionLabel="トップへ戻る"
          actionHref="/"
        />
      </div>
    );
  }

  const [openReports, candidateProposals, reviewProposals, staleTerms, discussionProposals, duplicateTermSource, drafts, stats] = await Promise.all([
    prisma.report.findMany({
      where: { status: "open" },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    }),
    prisma.translationProposal.findMany({
      where: {
        status: { in: ["active", "draft"] },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        sense: {
          include: {
            term: true,
            domain: true,
          },
        },
        evaluations: true,
        examples: true,
      },
    }),
    prisma.translationProposal.findMany({
      where: {
        status: { not: "hidden" },
        evaluations: { some: {} },
      },
      take: 80,
      orderBy: { updatedAt: "desc" },
      include: {
        sense: {
          include: {
            term: true,
            domain: true,
          },
        },
        evaluations: true,
        examples: true,
      },
    }),
    prisma.term.findMany({
      take: 8,
      orderBy: { updatedAt: "asc" },
      include: {
        senses: {
          include: {
            proposals: true,
            recommendations: true,
          },
        },
      },
    }),
    prisma.translationProposal.findMany({
      where: {
        status: { not: "hidden" },
        comments: { some: {} },
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        sense: {
          include: {
            term: true,
            domain: true,
          },
        },
        comments: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { user: true },
        },
      },
    }),
    prisma.term.findMany({
      select: {
        id: true,
        headword: true,
        slug: true,
        normalizedHeadword: true,
        originalWord: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.translationProposal.count({ where: { status: "draft" } }),
    Promise.all([
      prisma.term.count(),
      prisma.translationProposal.count(),
      prisma.recommendation.count(),
      prisma.report.count({ where: { status: "open" } }),
    ]),
  ]);

  const reportProposalIds = openReports
    .filter((report) => report.targetType === "proposal")
    .map((report) => report.targetId);
  const reportTermIds = openReports
    .filter((report) => report.targetType === "term")
    .map((report) => report.targetId);
  const reportExampleIds = openReports
    .filter((report) => report.targetType === "example")
    .map((report) => report.targetId);
  const reportCommentIds = openReports
    .filter((report) => report.targetType === "comment")
    .map((report) => report.targetId);
  const [reportProposalTargets, reportTermTargets, reportExampleTargets, reportCommentTargets] = await Promise.all([
    prisma.translationProposal.findMany({
      where: { id: { in: reportProposalIds } },
      include: {
        sense: {
          include: {
            term: true,
          },
        },
        createdBy: true,
      },
    }),
    prisma.term.findMany({
      where: { id: { in: reportTermIds } },
    }),
    prisma.usageExample.findMany({
      where: { id: { in: reportExampleIds } },
      include: {
        term: true,
        proposal: true,
      },
    }),
    prisma.comment.findMany({
      where: { id: { in: reportCommentIds } },
      include: {
        proposal: {
          include: {
            sense: {
              include: {
                term: true,
              },
            },
          },
        },
        user: true,
      },
    }),
  ]);
  const reportTargetLinks = new Map<string, { href: string; label: string }>();
  for (const proposal of reportProposalTargets) {
    reportTargetLinks.set(`proposal:${proposal.id}`, {
      href: `/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`,
      label: `${proposal.sense.term.headword} / ${proposal.text}`,
    });
  }
  for (const term of reportTermTargets) {
    reportTargetLinks.set(`term:${term.id}`, {
      href: `/terms/${term.slug}`,
      label: term.headword,
    });
  }
  for (const example of reportExampleTargets) {
    reportTargetLinks.set(`example:${example.id}`, {
      href: example.proposalId
        ? `/terms/${example.term.slug}#proposal-${example.proposalId}-${example.id}`
        : `/terms/${example.term.slug}`,
      label: `${example.term.headword} / ${example.rewrittenSentence}`,
    });
  }
  for (const comment of reportCommentTargets) {
    if (!comment.proposal) continue;
    reportTargetLinks.set(`comment:${comment.id}`, {
      href: `/terms/${comment.proposal.sense.term.slug}#comment-${comment.id}`,
      label: `${comment.proposal.sense.term.headword} / ${comment.user.displayName}のコメント`,
    });
  }

  const [termCount, proposalCount, recommendationCount, reportCount] = stats;
  const canEdit = currentUser ? canEditRecommendations(currentUser.role) : false;
  const recommendedCandidates = [...candidateProposals]
    .sort((a, b) => scoreProposal(b) - scoreProposal(a))
    .slice(0, 8);
  const splitEvaluationProposals = reviewProposals
    .filter((proposal) => {
      const counts = countLabels(proposal.evaluations);
      const positiveCount = positiveLabels.reduce((sum, label) => sum + (counts[label] ?? 0), 0);
      const negativeCount = negativeLabels.reduce((sum, label) => sum + (counts[label] ?? 0), 0);
      return positiveCount > 0 && negativeCount > 0;
    })
    .slice(0, 6);
  const staleReviewTerms = staleTerms
    .filter((term) => term.senses.some((sense) => sense.proposals.length > 0 && sense.recommendations.length === 0))
    .slice(0, 6);
  const duplicateGroups = Array.from(
    duplicateTermSource.reduce((groups, term) => {
      const key = term.normalizedHeadword || term.originalWord?.toLowerCase();
      if (!key) return groups;
      groups.set(key, [...(groups.get(key) ?? []), term]);
      return groups;
    }, new Map<string, typeof duplicateTermSource>()),
  )
    .map(([, terms]) => terms)
    .filter((terms) => terms.length > 1)
    .slice(0, 5);

  return (
    <div className="page-shell">
      <section className="page-title">
        <p className="eyebrow">整理</p>
        <h1>編集者ダッシュボード</h1>
      </section>

      <section className="metric-row dashboard-metrics">
        <div>
          <strong>{termCount}</strong>
          <span>項目</span>
        </div>
        <div>
          <strong>{proposalCount}</strong>
          <span>訳語案</span>
        </div>
        <div>
          <strong>{recommendationCount}</strong>
          <span>推奨訳</span>
        </div>
        <div>
          <strong>{reportCount}</strong>
          <span>未処理通報</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="content-column wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">キュー</p>
              <h2>推奨候補</h2>
            </div>
            <Gauge size={20} />
          </div>
          <div className="queue-list">
            {recommendedCandidates.map((proposal) => (
              <article key={proposal.id} className="queue-item">
                <div>
                  <p className="eyebrow">
                    {proposal.sense.term.headword} / {proposal.sense.domain?.name ?? "未分類"}
                  </p>
                  <h3>{proposal.text}</h3>
                  <p>{proposal.fitContext}</p>
                  <small>スコア {scoreProposal(proposal)} / 評価 {proposal.evaluations.length} / 使用例 {proposal.examples.length}</small>
                </div>
                <Link href={`/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`} className="icon-link">
                  <ArrowRight size={17} />
                  <span>確認</span>
                </Link>
                {canEdit ? (
                  <form action={setRecommendation} className="compact-recommend-form">
                    <input type="hidden" name="senseId" value={proposal.senseId} />
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="termSlug" value={proposal.sense.term.slug} />
                    <select name="level" defaultValue="tentative" aria-label="推奨レベル">
                      {RECOMMENDATION_LEVELS.map((level) => (
                        <option key={level.id} value={level.id}>{level.label}</option>
                      ))}
                    </select>
                    <input name="context" defaultValue={proposal.fitContext} aria-label="文脈" />
                    <input name="rationale" defaultValue={proposal.rationale ?? "評価と使用例をもとに整理"} aria-label="根拠" />
                    <button type="submit">
                      <ShieldCheck size={16} />
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <aside className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">監視</p>
              <h2>通報</h2>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div className="report-list">
            {openReports.length === 0 ? <p className="muted">未処理の通報はありません。</p> : null}
            {openReports.map((report) => {
              const targetLink = reportTargetLinks.get(`${report.targetType}:${report.targetId}`);
              return (
                <div key={report.id} className="report-item">
                  <strong>{report.reason}</strong>
                  <span>{report.targetType} / 通報者: {report.createdBy.displayName}</span>
                  {targetLink ? (
                    <Link href={targetLink.href} className="text-link">
                      {targetLink.label}
                    </Link>
                  ) : null}
                  {report.detail ? <p>{report.detail}</p> : null}
                  <div className="moderation-actions">
                    {report.targetType === "proposal" ? (
                      <form action={hideProposal}>
                        <input type="hidden" name="proposalId" value={report.targetId} />
                        <input type="hidden" name="reason" value={`通報対応: ${report.reason}`} />
                        <input type="hidden" name="returnTo" value="/dashboard" />
                        <button type="submit">
                          <EyeOff size={15} />
                          非表示
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveReport}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button type="submit">処理済み</button>
                    </form>
                    <form action={resolveReport}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="dismissed" />
                      <button type="submit">却下</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="note-box">
            <strong>草案</strong>
            <p>{drafts}件の訳語案に使用例が不足しています。</p>
          </div>
        </aside>
      </section>

      <section className="queue-grid">
        <div className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">重複</p>
              <h2>重複候補</h2>
            </div>
            <GitMerge size={20} />
          </div>
          <div className="queue-list">
            {duplicateGroups.length === 0 ? <p className="muted">明確な重複候補はありません。</p> : null}
            {duplicateGroups.map((group) => (
              <article key={group[0].normalizedHeadword} className="queue-item">
                <div>
                  <h3>{group.map((term) => term.headword).join(" / ")}</h3>
                  <p>{group[0].normalizedHeadword}</p>
                </div>
                <div className="queue-links">
                  {group.map((term) => (
                    <Link key={term.id} href={`/terms/${term.slug}`} className="text-link">
                      {term.headword}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">評価</p>
              <h2>評価が割れている訳語</h2>
            </div>
            <Gauge size={20} />
          </div>
          <div className="queue-list">
            {splitEvaluationProposals.length === 0 ? <p className="muted">評価が大きく割れている訳語はありません。</p> : null}
            {splitEvaluationProposals.map((proposal) => {
              const counts = countLabels(proposal.evaluations);
              return (
                <article key={proposal.id} className="queue-item">
                  <div>
                    <p className="eyebrow">
                      {proposal.sense.term.headword} / {proposal.sense.domain?.name ?? "未分類"}
                    </p>
                    <h3>{proposal.text}</h3>
                    <p>肯定 {positiveLabels.reduce((sum, label) => sum + (counts[label] ?? 0), 0)} / 懸念 {negativeLabels.reduce((sum, label) => sum + (counts[label] ?? 0), 0)}</p>
                  </div>
                  <Link href={`/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`} className="icon-link">
                    <ArrowRight size={17} />
                    <span>確認</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <div className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">古い項目</p>
              <h2>推奨訳が未整理</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="queue-list">
            {staleReviewTerms.length === 0 ? <p className="muted">未整理の古い項目はありません。</p> : null}
            {staleReviewTerms.map((term) => (
              <article key={term.id} className="queue-item">
                <div>
                  <h3>{term.headword}</h3>
                  <p>最終更新: {term.updatedAt.toLocaleDateString("ja-JP")}</p>
                </div>
                <Link href={`/terms/${term.slug}`} className="icon-link">
                  <ArrowRight size={17} />
                  <span>確認</span>
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">議論</p>
              <h2>コメントが増えた訳語</h2>
            </div>
            <MessageSquare size={20} />
          </div>
          <div className="queue-list">
            {discussionProposals.length === 0 ? <p className="muted">最近の議論はありません。</p> : null}
            {discussionProposals.map((proposal) => (
              <article key={proposal.id} className="queue-item">
                <div>
                  <p className="eyebrow">
                    {proposal.sense.term.headword} / {proposal.sense.domain?.name ?? "未分類"}
                  </p>
                  <h3>{proposal.text}</h3>
                  <p>{proposal.comments[0]?.body ?? "コメントあり"}</p>
                  <small>{proposal.comments.length}件表示中 / 最新: {proposal.comments[0]?.createdAt.toLocaleDateString("ja-JP")}</small>
                </div>
                <Link href={`/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`} className="icon-link">
                  <ArrowRight size={17} />
                  <span>確認</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
