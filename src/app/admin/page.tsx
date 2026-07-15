import { KeyRound, Shield, UserRoundCog, UserX } from "lucide-react";
import {
  resetUserPasswordWithState,
  suspendUserWithState,
  unsuspendUserWithState,
  updateUserRoleWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { canAdmin, getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type AdminPageProps = {
  searchParams: Promise<{ q?: string }>;
};

const roleLabels: Record<string, string> = {
  admin: "管理者",
  editor: "編集者",
  trusted: "信頼ユーザー",
  user: "利用者",
};

const roleOptions = [
  ["user", "利用者"],
  ["trusted", "信頼ユーザー"],
  ["editor", "編集者"],
  ["admin", "管理者"],
] as const;

export const metadata = {
  title: "管理者",
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [{ q = "" }, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const query = q.trim();

  if (!currentUser || !canAdmin(currentUser.role)) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="管理者専用です"
          body="ユーザー検索、ロール変更、停止解除は管理者だけが行えます。"
          actionLabel="トップへ戻る"
          actionHref="/"
        />
      </div>
    );
  }

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { displayName: { contains: query } },
            { handle: { contains: query } },
            { email: { contains: query.toLowerCase() } },
          ],
        }
      : undefined,
    take: 40,
    orderBy: [{ suspendedAt: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          terms: true,
          proposals: true,
          comments: true,
          reports: true,
        },
      },
    },
  });

  const returnTo = query ? `/admin?q=${encodeURIComponent(query)}` : "/admin";

  return (
    <div className="page-shell">
      <section className="page-title">
        <p className="eyebrow">Admin</p>
        <h1>ユーザー管理</h1>
        <p>ロール変更、停止、停止解除を行います。自分自身のロール変更と停止はできません。</p>
      </section>

      <form action="/admin" className="admin-search">
        <label>
          ユーザー検索
          <input name="q" defaultValue={query} placeholder="表示名、ハンドル、メールアドレス" />
        </label>
        <button type="submit" className="button secondary">
          <UserRoundCog size={17} />
          <span>検索</span>
        </button>
      </form>

      <section className="admin-user-list">
        {users.map((managedUser) => (
          <article key={managedUser.id} className={managedUser.suspendedAt ? "admin-user suspended" : "admin-user"}>
            <div className="admin-user-main">
              <div>
                <h2>{managedUser.displayName}</h2>
                <p>
                  @{managedUser.handle}
                  {managedUser.email ? ` / ${managedUser.email}` : ""}
                </p>
              </div>
              <span className="role-pill">{roleLabels[managedUser.role] ?? managedUser.role}</span>
            </div>

            <dl className="admin-user-stats">
              <div>
                <dt>項目</dt>
                <dd>{managedUser._count.terms}</dd>
              </div>
              <div>
                <dt>訳語案</dt>
                <dd>{managedUser._count.proposals}</dd>
              </div>
              <div>
                <dt>コメント</dt>
                <dd>{managedUser._count.comments}</dd>
              </div>
              <div>
                <dt>通報</dt>
                <dd>{managedUser._count.reports}</dd>
              </div>
            </dl>

            {managedUser.suspendedAt ? (
              <p className="status-line">停止中: {managedUser.suspendedAt.toLocaleString("ja-JP")}</p>
            ) : null}

            <div className="admin-user-actions">
              <ActionForm action={updateUserRoleWithState} pendingMessage="ロールを変更しています…">
                <input type="hidden" name="userId" value={managedUser.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <select name="role" defaultValue={managedUser.role} aria-label={`${managedUser.displayName}のロール`}>
                  {roleOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={managedUser.id === currentUser.id}>
                  <Shield size={15} />
                  変更
                </button>
              </ActionForm>

              {managedUser.suspendedAt ? (
                <ActionForm action={unsuspendUserWithState} pendingMessage="停止を解除しています…">
                  <input type="hidden" name="userId" value={managedUser.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit">停止解除</button>
                </ActionForm>
              ) : (
                <ActionForm action={suspendUserWithState} pendingMessage="アカウントを停止しています…">
                  <input type="hidden" name="userId" value={managedUser.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" disabled={managedUser.id === currentUser.id}>
                    <UserX size={15} />
                    停止
                  </button>
                </ActionForm>
              )}
            </div>

            <details className="admin-reset-details">
              <summary>
                <KeyRound size={15} />
                一時パスワードを発行
              </summary>
              <ActionForm action={resetUserPasswordWithState} className="inline-form" pendingMessage="一時パスワードを設定しています…">
                <input type="hidden" name="userId" value={managedUser.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  name="temporaryPassword"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="12文字以上の一時パスワード"
                  disabled={managedUser.id === currentUser.id}
                />
                <button type="submit" disabled={managedUser.id === currentUser.id}>発行</button>
              </ActionForm>
              <p className="muted">安全な方法で本人へ伝えてください。次回ログイン後に変更を求めます。</p>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
