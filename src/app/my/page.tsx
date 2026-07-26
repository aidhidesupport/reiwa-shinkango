import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Settings,
  Star,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { EVALUATION_LABELS } from "@/lib/labels";
import { splitLabels } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type ActivityType = "posts" | "comments" | "evaluations";

type MyPageProps = {
  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
};

type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  context: string;
  href: string;
  createdAt: Date;
};

const PAGE_SIZE = 12;
const activityTypes = new Set<ActivityType>(["posts", "comments", "evaluations"]);
const evaluationLabels = new Map(EVALUATION_LABELS.map((label) => [label.id, label.label]));

export const metadata = {
  title: "マイページ",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function requestedPage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function activityUrl(type: ActivityType, page = 1) {
  const query = new URLSearchParams({ type });
  if (page > 1) query.set("page", String(page));
  return `/my?${query.toString()}`;
}

export default async function MyPage({ searchParams }: MyPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="ログインが必要です"
          body="自分の投稿、コメント、評価を見るにはログインしてください。"
          actionLabel="ログイン"
          actionHref="/login?returnTo=/my"
        />
      </div>
    );
  }

  const type = activityTypes.has(params.type as ActivityType)
    ? params.type as ActivityType
    : "posts";
  const [termCount, senseCount, proposalCount, exampleCount, commentCount, evaluationCount] = await Promise.all([
    prisma.term.count({ where: { createdById: user.id } }),
    prisma.sense.count({ where: { createdById: user.id } }),
    prisma.translationProposal.count({ where: { createdById: user.id } }),
    prisma.usageExample.count({ where: { createdById: user.id } }),
    prisma.comment.count({ where: { userId: user.id } }),
    prisma.evaluation.count({ where: { userId: user.id } }),
  ]);
  const postCount = termCount + senseCount + proposalCount + exampleCount;
  const totalCount = type === "posts"
    ? postCount
    : type === "comments"
      ? commentCount
      : evaluationCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage(params.page), totalPages);
  const skip = (page - 1) * PAGE_SIZE;
  let items: ActivityItem[] = [];

  if (type === "posts") {
    const take = skip + PAGE_SIZE;
    const [terms, senses, proposals, examples] = await Promise.all([
      prisma.term.findMany({
        where: { createdById: user.id },
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          headword: true,
          slug: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.sense.findMany({
        where: { createdById: user.id },
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          term: { select: { headword: true, slug: true } },
        },
      }),
      prisma.translationProposal.findMany({
        where: { createdById: user.id },
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          text: true,
          fitContext: true,
          createdAt: true,
          sense: {
            select: {
              title: true,
              term: { select: { headword: true, slug: true } },
            },
          },
        },
      }),
      prisma.usageExample.findMany({
        where: { createdById: user.id },
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          proposalId: true,
          originalSentence: true,
          rewrittenSentence: true,
          createdAt: true,
          term: { select: { headword: true, slug: true } },
          sense: { select: { id: true, title: true } },
        },
      }),
    ]);

    items = [
      ...terms.map((term): ActivityItem => ({
        id: `term-${term.id}`,
        kind: "項目",
        title: term.headword,
        context: term.summary,
        href: `/terms/${term.slug}`,
        createdAt: term.createdAt,
      })),
      ...senses.map((sense): ActivityItem => ({
        id: `sense-${sense.id}`,
        kind: "使われ方",
        title: sense.title,
        context: `${sense.term.headword} / ${sense.description}`,
        href: `/terms/${sense.term.slug}#sense-${sense.id}`,
        createdAt: sense.createdAt,
      })),
      ...proposals.map((proposal): ActivityItem => ({
        id: `proposal-${proposal.id}`,
        kind: "日本語案",
        title: proposal.text,
        context: `${proposal.sense.term.headword} / ${proposal.sense.title} / 合う場面: ${proposal.fitContext}`,
        href: `/terms/${proposal.sense.term.slug}#proposal-${proposal.id}`,
        createdAt: proposal.createdAt,
      })),
      ...examples.map((example): ActivityItem => ({
        id: `example-${example.id}`,
        kind: "使用例",
        title: example.rewrittenSentence,
        context: `${example.term.headword} / 元の文: ${example.originalSentence}`,
        href: example.proposalId
          ? `/terms/${example.term.slug}#proposal-${example.proposalId}-${example.id}`
          : `/terms/${example.term.slug}#sense-${example.sense.id}`,
        createdAt: example.createdAt,
      })),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(skip, skip + PAGE_SIZE);
  } else if (type === "comments") {
    const comments = await prisma.comment.findMany({
      where: { userId: user.id },
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        proposal: {
          include: {
            sense: {
              include: { term: true },
            },
          },
        },
      },
    });
    items = comments.map((comment) => ({
      id: `comment-${comment.id}`,
      kind: "コメント",
      title: comment.body,
      context: comment.proposal
        ? `${comment.proposal.sense.term.headword} / 日本語案「${comment.proposal.text}」`
        : "関連先のないコメント",
      href: comment.proposal
        ? `/terms/${comment.proposal.sense.term.slug}#comment-${comment.id}`
        : "/my?type=comments",
      createdAt: comment.createdAt,
    }));
  } else {
    const evaluations = await prisma.evaluation.findMany({
      where: { userId: user.id },
      skip,
      take: PAGE_SIZE,
      orderBy: { updatedAt: "desc" },
      include: {
        proposal: {
          include: {
            sense: {
              include: { term: true },
            },
          },
        },
      },
    });
    items = evaluations.map((evaluation) => {
      const labels = splitLabels(evaluation.labelsCsv)
        .map((label) => evaluationLabels.get(label as typeof EVALUATION_LABELS[number]["id"]) ?? label)
        .join("・");
      return {
        id: `evaluation-${evaluation.id}`,
        kind: "評価",
        title: evaluation.proposal.text,
        context: `${evaluation.proposal.sense.term.headword} / ${labels || "評価項目なし"}`,
        href: `/terms/${evaluation.proposal.sense.term.slug}#proposal-${evaluation.proposalId}`,
        createdAt: evaluation.updatedAt,
      };
    });
  }

  const tabs = [
    { id: "posts" as const, label: "投稿", count: postCount, icon: FileText },
    { id: "comments" as const, label: "コメント", count: commentCount, icon: MessageSquare },
    { id: "evaluations" as const, label: "評価", count: evaluationCount, icon: Star },
  ];

  return (
    <div className="page-shell narrow">
      <section className="my-page-head">
        <div>
          <p className="eyebrow">My page</p>
          <h1>{user.displayName}さんの活動</h1>
          <p>自分が投稿・更新した内容と、コメント、評価を新しい順に確認できます。</p>
        </div>
        <Link href="/account" className="button secondary">
          <Settings size={17} aria-hidden="true" />
          アカウント設定
        </Link>
      </section>

      <dl className="my-activity-summary">
        <div>
          <dt>投稿</dt>
          <dd>{postCount}</dd>
          <p>項目 {termCount}・使われ方 {senseCount}・日本語案 {proposalCount}・使用例 {exampleCount}</p>
        </div>
        <div>
          <dt>コメント</dt>
          <dd>{commentCount}</dd>
          <p>日本語案ごとの議論への投稿</p>
        </div>
        <div>
          <dt>評価</dt>
          <dd>{evaluationCount}</dd>
          <p>現在保存されている自分の評価</p>
        </div>
      </dl>

      <nav className="activity-tabs" aria-label="活動の種類">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={activityUrl(tab.id)}
              className={type === tab.id ? "active" : undefined}
              aria-current={type === tab.id ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
              <span>{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      {items.length > 0 ? (
        <section className="activity-list" aria-label={`${tabs.find((tab) => tab.id === type)?.label}一覧`}>
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="activity-item">
              <div className="activity-item-head">
                <span>{item.kind}</span>
                <time dateTime={item.createdAt.toISOString()}>
                  {item.createdAt.toLocaleString("ja-JP")}
                </time>
              </div>
              <h2>{item.title}</h2>
              <p>{item.context}</p>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState
          title={`自分の${tabs.find((tab) => tab.id === type)?.label ?? "活動"}はまだありません`}
          body={type === "posts"
            ? "最初の項目や日本語案を投稿すると、ここから後で見直せます。"
            : "参加した内容がここに新しい順で表示されます。"}
          actionLabel={type === "posts" ? "項目を投稿" : undefined}
          actionHref={type === "posts" ? "/terms/new" : undefined}
        />
      )}

      {totalPages > 1 ? (
        <nav className="activity-pagination" aria-label="活動一覧のページ送り">
          {page > 1 ? (
            <Link href={activityUrl(type, page - 1)}>
              <ChevronLeft size={16} aria-hidden="true" />
              前へ
            </Link>
          ) : <span />}
          <p>{page} / {totalPages}ページ</p>
          {page < totalPages ? (
            <Link href={activityUrl(type, page + 1)}>
              次へ
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ) : <span />}
        </nav>
      ) : null}
    </div>
  );
}
