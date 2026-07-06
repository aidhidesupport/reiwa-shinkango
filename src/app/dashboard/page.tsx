import Link from "next/link";
import { AlertTriangle, ArrowRight, EyeOff, Gauge, ShieldCheck } from "lucide-react";
import { hideProposal, resolveReport, setRecommendation } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { RECOMMENDATION_LEVELS } from "@/lib/labels";
import { getCurrentUser, canEditRecommendations } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "編集者ダッシュボード",
};

export const dynamic = "force-dynamic";

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

  const [openReports, candidateProposals, drafts, stats] = await Promise.all([
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
      take: 8,
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
  const reportTargets = await prisma.translationProposal.findMany({
    where: { id: { in: reportProposalIds } },
    include: {
      sense: {
        include: {
          term: true,
        },
      },
      createdBy: true,
    },
  });
  const reportTargetMap = new Map(reportTargets.map((proposal) => [proposal.id, proposal]));

  const [termCount, proposalCount, recommendationCount, reportCount] = stats;
  const canEdit = currentUser ? canEditRecommendations(currentUser.role) : false;

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
            {candidateProposals.map((proposal) => (
              <article key={proposal.id} className="queue-item">
                <div>
                  <p className="eyebrow">
                    {proposal.sense.term.headword} / {proposal.sense.domain?.name ?? "未分類"}
                  </p>
                  <h3>{proposal.text}</h3>
                  <p>{proposal.fitContext}</p>
                  <small>評価 {proposal.evaluations.length} / 使用例 {proposal.examples.length}</small>
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
            {openReports.map((report) => (
              <div key={report.id} className="report-item">
                <strong>{report.reason}</strong>
                <span>{report.targetType} / 通報者: {report.createdBy.displayName}</span>
                {report.targetType === "proposal" && reportTargetMap.get(report.targetId) ? (
                  <Link
                    href={`/terms/${reportTargetMap.get(report.targetId)?.sense.term.slug}#proposal-${report.targetId}`}
                    className="text-link"
                  >
                    {reportTargetMap.get(report.targetId)?.sense.term.headword} /{" "}
                    {reportTargetMap.get(report.targetId)?.text}
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
            ))}
          </div>
          <div className="note-box">
            <strong>草案</strong>
            <p>{drafts}件の訳語案に使用例が不足しています。</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
