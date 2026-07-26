import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { markAllNotificationsRead, openNotification } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type NotificationView = "all" | "unread";

type NotificationsPageProps = {
  searchParams: Promise<{
    view?: string;
    page?: string;
    read?: string;
  }>;
};

const PAGE_SIZE = 20;

export const metadata = {
  title: "通知",
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

function notificationsUrl(view: NotificationView, page = 1) {
  const query = new URLSearchParams();
  if (view === "unread") query.set("view", view);
  if (page > 1) query.set("page", String(page));
  const value = query.toString();
  return value ? `/notifications?${value}` : "/notifications";
}

const typeDetails = {
  comment: {
    label: "コメント",
    icon: MessageSquare,
  },
  recommendation: {
    label: "推奨判断",
    icon: Award,
  },
  report: {
    label: "通報結果",
    icon: ShieldCheck,
  },
} as const;

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="ログインが必要です"
          body="自分宛ての通知を見るにはログインしてください。"
          actionLabel="ログイン"
          actionHref="/login?returnTo=/notifications"
        />
      </div>
    );
  }

  const view: NotificationView = params.view === "unread" ? "unread" : "all";
  const [allCount, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const totalCount = view === "unread" ? unreadCount : allCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage(params.page), totalPages);
  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(view === "unread" ? { readAt: null } : {}),
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell narrow">
      <section className="notification-page-head">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>通知</h1>
          <p>自分の投稿への反応と、編集・運営上の処理結果を確認できます。</p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="button secondary">
              <CheckCheck size={17} aria-hidden="true" />
              すべて既読にする
            </button>
          </form>
        ) : null}
      </section>

      {params.read === "all" ? <p className="notice success">すべての通知を既読にしました。</p> : null}

      <nav className="notification-tabs" aria-label="通知の表示条件">
        <Link href={notificationsUrl("all")} className={view === "all" ? "active" : undefined} aria-current={view === "all" ? "page" : undefined}>
          すべて
          <span>{allCount}</span>
        </Link>
        <Link href={notificationsUrl("unread")} className={view === "unread" ? "active" : undefined} aria-current={view === "unread" ? "page" : undefined}>
          未読
          <span>{unreadCount}</span>
        </Link>
      </nav>

      {notifications.length > 0 ? (
        <section className="notification-list" aria-label="通知一覧">
          {notifications.map((notification) => {
            const details = typeDetails[notification.type as keyof typeof typeDetails] ?? {
              label: "お知らせ",
              icon: Bell,
            };
            const Icon = details.icon;
            return (
              <article
                key={notification.id}
                className={notification.readAt ? "notification-item" : "notification-item unread"}
              >
                <div className="notification-icon" aria-hidden="true">
                  <Icon size={19} />
                </div>
                <div className="notification-copy">
                  <div className="notification-meta">
                    <span>{details.label}</span>
                    <time dateTime={notification.createdAt.toISOString()}>
                      {notification.createdAt.toLocaleString("ja-JP")}
                    </time>
                  </div>
                  <h2>{notification.title}</h2>
                  <p>{notification.body}</p>
                </div>
                <form action={openNotification}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <button type="submit" className="notification-open-button">
                    内容を見る
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title={view === "unread" ? "未読の通知はありません" : "通知はまだありません"}
          body="日本語案へのコメント、推奨判断、通報の処理結果がここに届きます。"
        />
      )}

      {totalPages > 1 ? (
        <nav className="activity-pagination" aria-label="通知一覧のページ送り">
          {page > 1 ? (
            <Link href={notificationsUrl(view, page - 1)}>
              <ChevronLeft size={16} aria-hidden="true" />
              前へ
            </Link>
          ) : <span />}
          <p>{page} / {totalPages}ページ</p>
          {page < totalPages ? (
            <Link href={notificationsUrl(view, page + 1)}>
              次へ
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ) : <span />}
        </nav>
      ) : null}
    </div>
  );
}
