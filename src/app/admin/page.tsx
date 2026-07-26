import { KeyRound, Shield, Trash2, UserRoundCog, UserX } from "lucide-react";
import {
  processAccountDeletionWithState,
  resetUserPasswordWithState,
  suspendUserWithState,
  unsuspendUserWithState,
  updateUserRoleWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { roleLabel } from "@/lib/permissions";
import { canAdmin, getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type AdminPageProps = {
  searchParams: Promise<{ q?: string; deletionProcessed?: string }>;
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
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const { q = "" } = params;
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

  const [users, deletionRequests] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(query ? {
          OR: [
            { displayName: { contains: query } },
            { handle: { contains: query } },
            { email: { contains: query.toLowerCase() } },
          ],
        } : {}),
      },
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
    }),
    prisma.accountDeletionRequest.findMany({
      where: { status: "pending" },
      orderBy: { requestedAt: "asc" },
      include: {
        user: {
          include: {
            _count: {
              select: {
                terms: true,
                proposals: true,
                comments: true,
                evaluations: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const returnTo = query ? `/admin?q=${encodeURIComponent(query)}` : "/admin";

  return (
    <div className="page-shell">
      <section className="page-title">
        <p className="eyebrow">Admin</p>
        <h1>ユーザー管理</h1>
        <p>削除申請の処理、ロール変更、停止、停止解除を行います。自分自身の管理操作はできません。</p>
      </section>

      {params.deletionProcessed ? (
        <p className="notice success">アカウント情報を消去し、投稿の作成者表示を匿名化しました。</p>
      ) : null}

      <section className="admin-deletion-queue">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Deletion requests</p>
            <h2>アカウント削除申請</h2>
          </div>
          <span className="count-pill">{deletionRequests.length}件</span>
        </div>
        {deletionRequests.length === 0 ? (
          <p className="muted">処理待ちの申請はありません。</p>
        ) : (
          <div className="deletion-request-list">
            {deletionRequests.map((request) => (
              <article key={request.id} className="deletion-request-card">
                <div>
                  <h3>{request.user.displayName} <span>@{request.user.handle}</span></h3>
                  <p>{request.user.email ?? "メールアドレスなし"} / 申請日時: {request.requestedAt.toLocaleString("ja-JP")}</p>
                  {request.reason ? <p>本人記入の理由: {request.reason}</p> : null}
                  <p>
                    項目 {request.user._count.terms}件・日本語案 {request.user._count.proposals}件・
                    コメント {request.user._count.comments}件・評価 {request.user._count.evaluations}件
                  </p>
                </div>
                <details className="admin-deletion-details">
                  <summary>
                    <Trash2 size={15} aria-hidden="true" />
                    削除処理を確認
                  </summary>
                  <ActionForm
                    action={processAccountDeletionWithState}
                    className="inline-form"
                    pendingMessage="本人情報を消去しています…"
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label>
                      「削除処理」と入力
                      <input name="confirmation" required pattern="削除処理" autoComplete="off" />
                    </label>
                    <button type="submit" className="danger-button" disabled={request.userId === currentUser.id}>
                      アカウント情報を消去
                    </button>
                  </ActionForm>
                  <p className="muted">メール、認証情報、プロフィールを消去します。この操作は元に戻せません。</p>
                </details>
              </article>
            ))}
          </div>
        )}
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
              <span className="role-pill">{roleLabel(managedUser.role)}</span>
            </div>

            <dl className="admin-user-stats">
              <div>
                <dt>項目</dt>
                <dd>{managedUser._count.terms}</dd>
              </div>
              <div>
                <dt>日本語案</dt>
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
