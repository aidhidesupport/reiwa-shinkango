import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  EyeOff,
  Gauge,
  GitMerge,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  hideContentWithState,
  resolveReportWithState,
  restoreContentWithState,
  reviewEditSuggestionWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { canAccessDashboard, getCurrentUser } from "@/lib/session";
import { countLabels, scoreProposal } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "編集者ダッシュボード",
};

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    proposalHidden?: string;
    reportResult?: string;
    visibilityResult?: string;
  }>;
};

const positiveLabels = ["natural", "clear", "concise", "accurate", "document_friendly", "conversation_friendly"];
const negativeLabels = ["too_stiff", "too_long", "meaning_shift", "old_fashioned", "too_coined"];
const reportReasonLabels: Record<string, string> = {
  meaning_error: "意味の誤り",
  duplicate: "重複",
  abuse: "攻撃的・迷惑行為",
  copyright: "権利問題",
  other: "その他",
};

const reportTargetTypeLabels: Record<string, string> = {
  term: "項目",
  proposal: "日本語案",
  example: "使用例",
  comment: "コメント",
};
const commentCategoryLabels: Record<string, string> = {
  meaning: "意味",
  tone: "語感",
  usage: "使用例",
  domain: "分野",
  alternative: "代案",
  other: "その他",
};

const suggestionFieldLabels: Record<string, string> = {
  title: "見出し",
  description: "説明",
  usageNote: "用法メモ",
  domainId: "分野ID",
  tags: "タグ",
  text: "日本語案",
  fitContext: "よく合う場面",
  unfitContext: "避けたい場面",
  rationale: "理由",
  pros: "良い点",
  cons: "弱い点",
  register: "文体",
  originalSentence: "元文",
  rewrittenSentence: "言い換え",
  contextNote: "文脈メモ",
};

function suggestionFields(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).map(([key, fieldValue]) => ({
      key,
      label: suggestionFieldLabels[key] ?? key,
      value: fieldValue === null || fieldValue === "" ? "なし" : String(fieldValue),
    }));
  } catch {
    return [{ key: "value", label: "修正内容", value }];
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [currentUser, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!currentUser || !canAccessDashboard(currentUser.role)) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="整理画面は編集者専用です"
          body="推奨する日本語案の確定、通報対応、非表示処理は編集者または管理者だけが行えます。"
          actionLabel="トップへ戻る"
          actionHref="/"
        />
      </div>
    );
  }

  const [openReports, candidateProposals, reviewProposals, staleTerms, discussionProposals, duplicateTermSource, drafts, stats, pendingSuggestions] = await Promise.all([
    prisma.report.findMany({
      where: { status: "open" },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    }),
    prisma.translationProposal.findMany({
      where: {
        status: { in: ["active", "draft"] },
        sense: { term: { status: "published" } },
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
        sense: { term: { status: "published" } },
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
      where: { status: "published" },
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
        sense: { term: { status: "published" } },
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
      where: { status: "published" },
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
      prisma.editSuggestion.count({ where: { status: "pending" } }),
    ]),
    prisma.editSuggestion.findMany({
      where: { status: "pending" },
      take: 20,
      orderBy: { createdAt: "asc" },
      include: { createdBy: true },
    }),
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
      include: { createdBy: true },
    }),
    prisma.usageExample.findMany({
      where: { id: { in: reportExampleIds } },
      include: {
        term: true,
        proposal: true,
        createdBy: true,
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
  const [hiddenTerms, hiddenProposals, hiddenExamples, hiddenComments] = await Promise.all([
    prisma.term.findMany({
      where: { status: "hidden" },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: { createdBy: true },
    }),
    prisma.translationProposal.findMany({
      where: { status: "hidden" },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: true,
        sense: { include: { term: true } },
      },
    }),
    prisma.usageExample.findMany({
      where: { status: "hidden" },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: true,
        term: true,
        proposal: true,
      },
    }),
    prisma.comment.findMany({
      where: { status: "hidden" },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        proposal: {
          include: {
            sense: { include: { term: true } },
          },
        },
      },
    }),
  ]);
  const hiddenTargetKeys = [
    ...hiddenTerms.map((item) => ({ entityType: "term", entityId: item.id })),
    ...hiddenProposals.map((item) => ({ entityType: "proposal", entityId: item.id })),
    ...hiddenExamples.map((item) => ({ entityType: "example", entityId: item.id })),
    ...hiddenComments.map((item) => ({ entityType: "comment", entityId: item.id })),
  ];
  const hiddenRevisions = hiddenTargetKeys.length > 0
    ? await prisma.revision.findMany({
        where: { OR: hiddenTargetKeys },
        orderBy: { createdAt: "desc" },
        include: { createdBy: true },
      })
    : [];
  const latestHiddenRevision = new Map<string, typeof hiddenRevisions[number]>();
  for (const revision of hiddenRevisions) {
    const key = `${revision.entityType}:${revision.entityId}`;
    if (!latestHiddenRevision.has(key) && revision.reason.startsWith("非公開:")) {
      latestHiddenRevision.set(key, revision);
    }
  }
  const suggestionSenseIds = pendingSuggestions.filter((item) => item.targetType === "sense").map((item) => item.targetId);
  const suggestionProposalIds = pendingSuggestions.filter((item) => item.targetType === "proposal").map((item) => item.targetId);
  const suggestionExampleIds = pendingSuggestions.filter((item) => item.targetType === "example").map((item) => item.targetId);
  const [suggestionSenses, suggestionProposals, suggestionExamples] = await Promise.all([
    prisma.sense.findMany({ where: { id: { in: suggestionSenseIds } }, include: { term: true } }),
    prisma.translationProposal.findMany({
      where: { id: { in: suggestionProposalIds } },
      include: { sense: { include: { term: true } } },
    }),
    prisma.usageExample.findMany({ where: { id: { in: suggestionExampleIds } }, include: { term: true } }),
  ]);
  const suggestionTargetLinks = new Map<string, { href: string; label: string }>();
  for (const sense of suggestionSenses) {
    suggestionTargetLinks.set(`sense:${sense.id}`, {
      href: `/terms/${sense.term.slug}#sense-${sense.id}`,
      label: `${sense.term.headword} / ${sense.title}`,
    });
  }
  for (const proposal of suggestionProposals) {
    suggestionTargetLinks.set(`proposal:${proposal.id}`, {
      href: `/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`,
      label: `${proposal.sense.term.headword} / ${proposal.text}`,
    });
  }
  for (const example of suggestionExamples) {
    suggestionTargetLinks.set(`example:${example.id}`, {
      href: `/terms/${example.term.slug}#proposal-${example.proposalId}-${example.id}`,
      label: `${example.term.headword} / ${example.rewrittenSentence}`,
    });
  }
  const reportTargets = new Map<string, {
    href: string;
    kind: string;
    title: string;
    context: string;
    preview: string;
    author: string;
    status: string;
    isHidden?: boolean;
  }>();
  for (const proposal of reportProposalTargets) {
    reportTargets.set(`proposal:${proposal.id}`, {
      href: `/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`,
      kind: "日本語案",
      title: proposal.text,
      context: `${proposal.sense.term.headword} / ${proposal.sense.title}`,
      preview: `合う場面: ${proposal.fitContext}`,
      author: proposal.createdBy.displayName,
      status: proposal.status === "hidden" ? "非表示" : "公開中",
      isHidden: proposal.status === "hidden",
    });
  }
  for (const term of reportTermTargets) {
    reportTargets.set(`term:${term.id}`, {
      href: `/terms/${term.slug}`,
      kind: "項目",
      title: term.headword,
      context: term.originalWord ? `原語: ${term.originalWord}` : "登録項目",
      preview: term.summary,
      author: term.createdBy.displayName,
      status: term.status === "published" ? "公開中" : "非公開",
      isHidden: term.status === "hidden",
    });
  }
  for (const example of reportExampleTargets) {
    reportTargets.set(`example:${example.id}`, {
      href: example.proposalId
        ? `/terms/${example.term.slug}#proposal-${example.proposalId}-${example.id}`
        : `/terms/${example.term.slug}`,
      kind: "使用例",
      title: example.rewrittenSentence,
      context: `${example.term.headword}${example.proposal ? ` / 日本語案「${example.proposal.text}」` : ""}`,
      preview: `元の文: ${example.originalSentence}`,
      author: example.createdBy.displayName,
      status: example.status === "hidden" ? "非公開" : "公開中",
      isHidden: example.status === "hidden",
    });
  }
  for (const comment of reportCommentTargets) {
    if (!comment.proposal) continue;
    reportTargets.set(`comment:${comment.id}`, {
      href: `/terms/${comment.proposal.sense.term.slug}#proposal-${comment.proposal.id}`,
      kind: "コメント",
      title: comment.body,
      context: `${comment.proposal.sense.term.headword} / 日本語案「${comment.proposal.text}」`,
      preview: `分類: ${commentCategoryLabels[comment.category] ?? "その他"}`,
      author: comment.user.displayName,
      status: comment.status === "hidden" ? "非公開" : "公開中",
      isHidden: comment.status === "hidden",
    });
  }

  type HiddenContentItem = {
    key: string;
    targetType: "term" | "proposal" | "example" | "comment";
    targetId: string;
    kind: string;
    title: string;
    context: string;
    href: string;
    author: string;
    hiddenAt: Date | null;
    hiddenBy: string;
    reason: string;
  };
  const hiddenContent: HiddenContentItem[] = [
    ...hiddenTerms.map((term): HiddenContentItem => {
      const revision = latestHiddenRevision.get(`term:${term.id}`);
      return {
        key: `term:${term.id}`,
        targetType: "term",
        targetId: term.id,
        kind: "項目",
        title: term.headword,
        context: term.summary,
        href: `/terms/${term.slug}`,
        author: term.createdBy.displayName,
        hiddenAt: revision?.createdAt ?? null,
        hiddenBy: revision?.createdBy.displayName ?? "不明",
        reason: revision?.reason.replace(/^非公開:\s*/, "") ?? "理由の記録なし",
      };
    }),
    ...hiddenProposals.map((proposal): HiddenContentItem => {
      const revision = latestHiddenRevision.get(`proposal:${proposal.id}`);
      return {
        key: `proposal:${proposal.id}`,
        targetType: "proposal",
        targetId: proposal.id,
        kind: "日本語案",
        title: proposal.text,
        context: `${proposal.sense.term.headword} / ${proposal.sense.title}`,
        href: `/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`,
        author: proposal.createdBy.displayName,
        hiddenAt: revision?.createdAt ?? null,
        hiddenBy: revision?.createdBy.displayName ?? "不明",
        reason: revision?.reason.replace(/^非公開:\s*/, "") ?? "理由の記録なし",
      };
    }),
    ...hiddenExamples.map((example): HiddenContentItem => {
      const revision = latestHiddenRevision.get(`example:${example.id}`);
      return {
        key: `example:${example.id}`,
        targetType: "example",
        targetId: example.id,
        kind: "使用例",
        title: example.rewrittenSentence,
        context: `${example.term.headword}${example.proposal ? ` / 日本語案「${example.proposal.text}」` : ""}`,
        href: example.proposalId
          ? `/terms/${example.term.slug}#proposal-${example.proposalId}-${example.id}`
          : `/terms/${example.term.slug}`,
        author: example.createdBy.displayName,
        hiddenAt: revision?.createdAt ?? null,
        hiddenBy: revision?.createdBy.displayName ?? "不明",
        reason: revision?.reason.replace(/^非公開:\s*/, "") ?? "理由の記録なし",
      };
    }),
    ...hiddenComments.map((comment): HiddenContentItem => {
      const revision = latestHiddenRevision.get(`comment:${comment.id}`);
      const term = comment.proposal?.sense.term;
      return {
        key: `comment:${comment.id}`,
        targetType: "comment",
        targetId: comment.id,
        kind: "コメント",
        title: comment.body,
        context: term && comment.proposal
          ? `${term.headword} / 日本語案「${comment.proposal.text}」`
          : "関連先なし",
        href: term && comment.proposal
          ? `/terms/${term.slug}#comment-${comment.id}`
          : "/dashboard#hidden-content",
        author: comment.user.displayName,
        hiddenAt: revision?.createdAt ?? null,
        hiddenBy: revision?.createdBy.displayName ?? "不明",
        reason: revision?.reason.replace(/^非公開:\s*/, "") ?? "理由の記録なし",
      };
    }),
  ].sort((left, right) => (right.hiddenAt?.getTime() ?? 0) - (left.hiddenAt?.getTime() ?? 0));

  const [termCount, proposalCount, recommendationCount, reportCount, pendingSuggestionCount] = stats;
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
        <p><Link href="/rules/permissions" className="text-link">編集者・管理者の権限表を確認</Link></p>
      </section>

      {params.proposalHidden ? (
        <p className="notice warning">
          日本語案を公開画面から非表示にしました。通報カードは残っているため、確認後に「処理済み」または「却下」で閉じてください。
        </p>
      ) : null}
      {params.reportResult === "resolved" ? (
        <p className="notice success">通報を対応済みとして閉じ、通報者へ処理結果を通知しました。</p>
      ) : null}
      {params.reportResult === "dismissed" ? (
        <p className="notice success">通報を対応なしで閉じ、通報者へ処理結果を通知しました。</p>
      ) : null}
      {params.visibilityResult === "hidden" ? (
        <p className="notice warning">投稿を公開画面から非公開にし、理由と実行者を履歴へ記録しました。</p>
      ) : null}
      {params.visibilityResult === "restored" ? (
        <p className="notice success">投稿を復元し、公開状態へ戻しました。</p>
      ) : null}

      <section className="metric-row dashboard-metrics">
        <div>
          <strong>{termCount}</strong>
          <span>項目</span>
        </div>
        <div>
          <strong>{proposalCount}</strong>
          <span>日本語案</span>
        </div>
        <div>
          <strong>{recommendationCount}</strong>
          <span>推奨する日本語案</span>
        </div>
        <div>
          <strong>{reportCount}</strong>
          <span>未処理通報</span>
        </div>
        <div>
          <strong>{pendingSuggestionCount}</strong>
          <span>修正提案</span>
        </div>
      </section>

      <section className="content-column hidden-content-queue" id="hidden-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">公開管理</p>
            <h2>非公開中の投稿</h2>
          </div>
          <EyeOff size={20} />
        </div>
        <p className="muted">
          非公開理由と実行者を確認し、内容を再確認できた投稿だけを復元します。
        </p>
        {hiddenContent.length === 0 ? <p className="muted">非公開中の投稿はありません。</p> : null}
        <div className="hidden-content-list">
          {hiddenContent.map((item) => (
            <article key={item.key} className="hidden-content-item">
              <div className="hidden-content-copy">
                <div className="hidden-content-head">
                  <span>{item.kind}</span>
                  <strong>非公開</strong>
                </div>
                <h3>{item.title}</h3>
                <p>{item.context}</p>
                <dl>
                  <div>
                    <dt>投稿者</dt>
                    <dd>{item.author}</dd>
                  </div>
                  <div>
                    <dt>非公開理由</dt>
                    <dd>{item.reason}</dd>
                  </div>
                  <div>
                    <dt>実行者</dt>
                    <dd>{item.hiddenBy}</dd>
                  </div>
                  <div>
                    <dt>実行日時</dt>
                    <dd>{item.hiddenAt ? item.hiddenAt.toLocaleString("ja-JP") : "記録なし"}</dd>
                  </div>
                </dl>
                <Link href={item.href} className="text-link">
                  編集者表示で内容を確認
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <ActionForm
                action={restoreContentWithState}
                className="restore-content-form"
                pendingMessage="復元しています…"
              >
                <input type="hidden" name="targetType" value={item.targetType} />
                <input type="hidden" name="targetId" value={item.targetId} />
                <input type="hidden" name="returnTo" value="/dashboard?visibilityResult=restored#hidden-content" />
                <label>
                  復元理由
                  <input
                    name="reason"
                    required
                    minLength={3}
                    maxLength={500}
                    placeholder="確認した内容と復元理由"
                  />
                </label>
                <button type="submit">
                  <RotateCcw size={15} aria-hidden="true" />
                  公開状態へ復元
                </button>
              </ActionForm>
            </article>
          ))}
        </div>
      </section>

      <section className="content-column suggestion-queue" id="suggestions">
        <div className="section-heading">
          <div>
            <p className="eyebrow">編集</p>
            <h2>修正提案</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        {pendingSuggestions.length === 0 ? <p className="muted">未処理の修正提案はありません。</p> : null}
        <div className="suggestion-list">
          {pendingSuggestions.map((suggestion) => {
            const target = suggestionTargetLinks.get(`${suggestion.targetType}:${suggestion.targetId}`);
            return (
              <article key={suggestion.id} className="suggestion-item">
                <div>
                  <p className="eyebrow">{suggestion.targetType} / {suggestion.createdBy.displayName}</p>
                  <h3>{target?.label ?? "対象が見つかりません"}</h3>
                  <p><strong>提案理由:</strong> {suggestion.reason}</p>
                  {target ? <Link href={target.href} className="text-link">現在の表示を確認</Link> : null}
                </div>
                <dl className="suggestion-fields">
                  {suggestionFields(suggestion.proposedJson).map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                <ActionForm action={reviewEditSuggestionWithState} className="suggestion-review" pendingMessage="提案を処理しています…">
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="returnTo" value="/dashboard#suggestions" />
                  <select name="decision" defaultValue="approved" aria-label="処理結果">
                    <option value="approved">承認して反映</option>
                    <option value="rejected">却下</option>
                  </select>
                  <input name="reviewNote" placeholder="判断理由（却下時は必須）" />
                  <button type="submit">処理する</button>
                </ActionForm>
              </article>
            );
          })}
        </div>
        {pendingSuggestionCount > pendingSuggestions.length ? (
          <p className="muted">古い順に{pendingSuggestions.length}件を表示しています。残り{pendingSuggestionCount - pendingSuggestions.length}件です。</p>
        ) : null}
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
                <Link href={`/terms/${proposal.sense.term.slug}#sense-${proposal.senseId}`} className="icon-link">
                  <ArrowRight size={17} />
                  <span>比較して決める</span>
                </Link>
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
              const target = reportTargets.get(`${report.targetType}:${report.targetId}`);
              return (
                <article key={report.id} className="report-item">
                  <header className="report-item-head">
                    <div>
                      <span className="report-kind">
                        {reportTargetTypeLabels[report.targetType] ?? "対象"}への通報
                      </span>
                      <h3>{reportReasonLabels[report.reason] ?? report.reason}</h3>
                    </div>
                    <time dateTime={report.createdAt.toISOString()}>
                      {report.createdAt.toLocaleString("ja-JP")}
                    </time>
                  </header>
                  <p className="report-reporter">通報者: {report.createdBy.displayName}</p>
                  {report.detail ? (
                    <div className="report-detail">
                      <strong>通報者からの補足</strong>
                      <p>{report.detail}</p>
                    </div>
                  ) : null}
                  {target ? (
                    <section className={target.isHidden ? "report-target-summary hidden" : "report-target-summary"}>
                      <div className="report-target-head">
                        <span>{target.kind}の現在内容</span>
                        <strong>{target.status}</strong>
                      </div>
                      <h4>{target.title}</h4>
                      <p>{target.context}</p>
                      <p>{target.preview}</p>
                      <div className="report-target-meta">
                        <span>投稿者: {target.author}</span>
                        <Link href={target.href} className="text-link">
                          対象を公開画面で確認
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </section>
                  ) : (
                    <p className="notice warning">対象は削除されたか、現在のデータから確認できません。</p>
                  )}
                  <div className="moderation-guidance">
                    <strong>処理を選ぶ</strong>
                    <p>必要なら先に非表示にし、最後に処理済みまたは却下で通報を閉じます。</p>
                  </div>
                  <div className="moderation-actions">
                    {target && !target.isHidden ? (
                      <div className="moderation-action">
                        <ActionForm action={hideContentWithState} pendingMessage="非公開にしています…">
                          <input type="hidden" name="targetType" value={report.targetType} />
                          <input type="hidden" name="targetId" value={report.targetId} />
                          <input type="hidden" name="reason" value={`通報対応: ${reportReasonLabels[report.reason] ?? report.reason}`} />
                          <input type="hidden" name="returnTo" value="/dashboard?visibilityResult=hidden#hidden-content" />
                          <button type="submit">
                            <EyeOff size={15} />
                            非公開
                          </button>
                        </ActionForm>
                        <small>{target.kind}を公開画面から隠す。通報は閉じない。</small>
                      </div>
                    ) : target?.isHidden ? (
                      <div className="moderation-action">
                        <button type="button" disabled>
                          <EyeOff size={15} />
                          非公開済み
                        </button>
                        <small>この{target.kind}はすでに公開画面から隠れています。</small>
                      </div>
                    ) : null}
                    <div className="moderation-action">
                      <ActionForm action={resolveReportWithState} pendingMessage="通報を処理しています…">
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <button type="submit">
                          <CheckCircle2 size={15} />
                          処理済み
                        </button>
                      </ActionForm>
                      <small>必要な確認・対応を終えて閉じ、通報者へ通知する。</small>
                    </div>
                    <div className="moderation-action">
                      <ActionForm action={resolveReportWithState} pendingMessage="通報を処理しています…">
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <button type="submit">
                          <XCircle size={15} />
                          却下
                        </button>
                      </ActionForm>
                      <small>対応不要と判断して閉じ、通報者へ通知する。</small>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="note-box">
            <strong>草案</strong>
            <p>{drafts}件の日本語案に使用例が不足しています。</p>
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
                  <Link
                    href={`/dashboard/merge?source=${group[1]!.id}&target=${group[0]!.id}`}
                    className="text-link"
                  >
                    この候補を統合
                  </Link>
                </div>
              </article>
            ))}
            <Link href="/dashboard/merge" className="button secondary">
              <GitMerge size={17} aria-hidden="true" />
              2つの項目を比較して統合
            </Link>
          </div>
        </div>

        <div className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">評価</p>
              <h2>評価が割れている日本語案</h2>
            </div>
            <Gauge size={20} />
          </div>
          <div className="queue-list">
            {splitEvaluationProposals.length === 0 ? <p className="muted">評価が大きく割れている日本語案はありません。</p> : null}
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
              <h2>推奨する日本語案が未整理</h2>
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
              <h2>コメントが増えた日本語案</h2>
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
