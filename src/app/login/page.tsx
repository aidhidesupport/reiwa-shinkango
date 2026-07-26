import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { signInWithState, signUpWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string; passwordReset?: string }>;
};

export const metadata = {
  title: "ログイン",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo = "/", passwordReset } = await searchParams;

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">アカウント</p>
        <h1>ログイン・登録</h1>
        <p>閲覧は誰でもできます。投稿、評価、コメントにはログインが必要です。</p>
      </section>

      {passwordReset ? (
        <p className="notice success">パスワードを変更しました。新しいパスワードでログインしてください。</p>
      ) : null}

      <section className="auth-grid">
        <ActionForm action={signInWithState} className="stacked-form" pendingMessage="ログインしています…">
          <h2>
            <LogIn size={20} />
            ログイン
          </h2>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            メールアドレス
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            パスワード
            <input name="password" type="password" required maxLength={256} autoComplete="current-password" />
          </label>
          <button type="submit" className="button">
            <LogIn size={17} />
            <span>ログイン</span>
          </button>
          <Link href="/forgot-password" className="text-link">パスワードを忘れた方</Link>
        </ActionForm>

        <ActionForm action={signUpWithState} className="stacked-form" pendingMessage="アカウントを作成しています…">
          <h2>
            <UserPlus size={20} />
            新規登録
          </h2>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            表示名
            <input name="displayName" required maxLength={80} autoComplete="name" />
          </label>
          <label>
            ハンドル
            <input name="handle" maxLength={30} placeholder="省略可" />
          </label>
          <label>
            メールアドレス
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            パスワード
            <input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" />
          </label>
          <label className="check-line">
            <input name="acceptTerms" type="checkbox" value="yes" required />
            <span>
              <Link href="/legal/terms" target="_blank">利用規約</Link>と
              <Link href="/rules" target="_blank">投稿データ方針</Link>（サイト内利用限定）に同意する
            </span>
          </label>
          <button type="submit" className="button secondary">
            <UserPlus size={17} />
            <span>登録</span>
          </button>
        </ActionForm>
      </section>

      {process.env.NODE_ENV !== "production" ? (
        <div className="note-box">
          <strong>ローカル初期管理者</strong>
          <p>
            初期データ投入後は `admin@example.com` / `change-me-admin-password` で管理者ログインできます。
            公開時は必ず環境変数で管理者メールとパスワードを変更してください。
          </p>
        </div>
      ) : null}
    </div>
  );
}
