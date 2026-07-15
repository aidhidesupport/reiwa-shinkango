import { KeyRound, UserRound } from "lucide-react";
import { changePasswordWithState, updateProfileWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentUser } from "@/lib/session";

type AccountPageProps = {
  searchParams: Promise<{ updated?: string; passwordChanged?: string; passwordReset?: string }>;
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

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">Account</p>
        <h1>アカウント設定</h1>
        <p>公開される表示名とハンドル、ログイン用パスワードを変更できます。</p>
      </section>

      {params.updated ? <p className="notice success">プロフィールを更新しました。</p> : null}
      {params.passwordChanged ? <p className="notice success">パスワードを変更しました。</p> : null}
      {user.mustChangePassword || params.passwordReset ? (
        <p className="notice warning">管理者が発行した一時パスワードでログインしています。新しいパスワードへ変更してください。</p>
      ) : null}

      <section className="account-grid">
        <ActionForm action={updateProfileWithState} className="stacked-form" pendingMessage="プロフィールを保存しています…">
          <h2>
            <UserRound size={20} />
            プロフィール
          </h2>
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
    </div>
  );
}
