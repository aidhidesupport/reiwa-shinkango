import { KeyRound, MailCheck, Trash2, UserRound, XCircle } from "lucide-react";
import {
  cancelAccountDeletionWithState,
  changePasswordWithState,
  requestEmailVerificationWithState,
  requestAccountDeletionWithState,
  updateProfileWithState,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type AccountPageProps = {
  searchParams: Promise<{
    updated?: string;
    passwordChanged?: string;
    passwordReset?: string;
    verificationSent?: string;
    verificationDelivery?: string;
    emailVerified?: string;
    deletionRequested?: string;
    deletionCancelled?: string;
  }>;
};

export const metadata = {
  title: "アカウント",
};

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="ログインが必要です"
          body="プロフィールとパスワードの変更にはログインしてください。"
          actionLabel="ログイン"
          actionHref="/login?returnTo=/account"
        />
      </div>
    );
  }
  const deletionRequest = await prisma.accountDeletionRequest.findUnique({
    where: { userId: user.id },
  });
  const deletionPending = deletionRequest?.status === "pending";

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">Account</p>
        <h1>アカウント設定</h1>
        <p>公開される表示名とハンドル、ログイン用パスワードを変更できます。</p>
      </section>

      {params.updated ? <p className="notice success">プロフィールを更新しました。</p> : null}
      {params.passwordChanged ? <p className="notice success">パスワードを変更しました。</p> : null}
      {params.emailVerified ? <p className="notice success">メールアドレスを確認しました。投稿や評価に参加できます。</p> : null}
      {params.deletionRequested ? (
        <p className="notice warning">アカウント削除を申請しました。管理者の処理前なら下から取り消せます。</p>
      ) : null}
      {params.deletionCancelled ? <p className="notice success">アカウント削除の申請を取り消しました。</p> : null}
      {params.verificationSent && params.verificationDelivery !== "failed" ? (
        <p className="notice success">確認メールを送信しました。24時間以内にメールのリンクを開いてください。</p>
      ) : null}
      {params.verificationDelivery === "failed" ? (
        <p className="notice warning">アカウントは作成しましたが、確認メールを送信できませんでした。下のボタンから再送してください。</p>
      ) : null}
      {user.mustChangePassword || params.passwordReset ? (
        <p className="notice warning">管理者が発行した一時パスワードでログインしています。新しいパスワードへ変更してください。</p>
      ) : null}

      {!user.emailVerifiedAt ? (
        <section className="note-box email-verification-panel">
          <div>
            <strong>メールアドレスの確認が必要です</strong>
            <p>
              {user.email} へ確認リンクを送ります。確認前も閲覧とアカウント設定はできますが、
              投稿、評価、コメント、通報は利用できません。
            </p>
          </div>
          <ActionForm
            action={requestEmailVerificationWithState}
            className="inline-form"
            pendingMessage="確認メールを送信しています…"
          >
            <button type="submit" className="button secondary">確認メールを再送</button>
          </ActionForm>
        </section>
      ) : null}

      <section className="account-grid">
        <ActionForm action={updateProfileWithState} className="stacked-form" pendingMessage="プロフィールを保存しています…">
          <h2>
            <UserRound size={20} />
            プロフィール
          </h2>
          {user.email ? (
            <p className="account-email">
              {user.emailVerifiedAt ? <MailCheck size={15} aria-hidden="true" /> : null}
              {user.email} {user.emailVerifiedAt ? "（確認済み）" : "（未確認）"}
            </p>
          ) : null}
          <label>
            表示名
            <input name="displayName" required maxLength={80} defaultValue={user.displayName} autoComplete="name" />
          </label>
          <label>
            ハンドル
            <input name="handle" required minLength={2} maxLength={30} defaultValue={user.handle} />
          </label>
          <p className="muted">文字、数字、_、-を使用できます。投稿と変更履歴に表示されます。</p>
          {user.mustChangePassword ? <p className="muted">一時パスワードを変更すると保存できます。</p> : null}
          <button type="submit" className="button secondary" disabled={user.mustChangePassword}>プロフィールを保存</button>
        </ActionForm>

        <ActionForm action={changePasswordWithState} className="stacked-form" pendingMessage="パスワードを変更しています…">
          <h2>
            <KeyRound size={20} />
            パスワード変更
          </h2>
          <label>
            現在のパスワード
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <label>
            新しいパスワード
            <input name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
          </label>
          <label>
            新しいパスワード（確認）
            <input name="confirmation" type="password" required minLength={12} autoComplete="new-password" />
          </label>
          <button type="submit" className="button">パスワードを変更</button>
        </ActionForm>
      </section>

      <section className="danger-zone">
        <div className="danger-zone-heading">
          <Trash2 size={20} aria-hidden="true" />
          <div>
            <h2>退会・アカウント削除</h2>
            <p>ログイン情報と公開プロフィールを消去します。投稿内容は議論の記録として残り、作成者は「退会済み利用者」と表示されます。</p>
          </div>
        </div>

        {deletionPending ? (
          <div className="deletion-request-status">
            <div>
              <strong>削除処理を待っています</strong>
              <p>
                申請日時: {deletionRequest.requestedAt.toLocaleString("ja-JP")}
                {deletionRequest.reason ? ` / 理由: ${deletionRequest.reason}` : ""}
              </p>
            </div>
            <ActionForm
              action={cancelAccountDeletionWithState}
              className="inline-form"
              pendingMessage="削除申請を取り消しています…"
            >
              <button type="submit" className="button secondary">
                <XCircle size={16} aria-hidden="true" />
                削除申請を取り消す
              </button>
            </ActionForm>
          </div>
        ) : (
          <details className="account-deletion-details">
            <summary>削除申請フォームを開く</summary>
            <ActionForm
              action={requestAccountDeletionWithState}
              className="stacked-form"
              pendingMessage="アカウント削除を申請しています…"
            >
              <p className="muted">
                管理者が処理すると、ログインできなくなり、元のプロフィールとメールアドレスは復元できません。
              </p>
              <label>
                現在のパスワード
                <input name="currentPassword" type="password" required autoComplete="current-password" />
              </label>
              <label>
                退会理由（任意）
                <textarea name="reason" maxLength={1000} rows={3} />
              </label>
              <label>
                確認のため「アカウントを削除」と入力
                <input
                  name="confirmation"
                  required
                  autoComplete="off"
                  pattern="アカウントを削除"
                />
              </label>
              <button type="submit" className="button danger-button">削除を申請する</button>
            </ActionForm>
          </details>
        )}
      </section>
    </div>
  );
}
