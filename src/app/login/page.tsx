import { LogIn, UserPlus } from "lucide-react";
import { signIn, signUp } from "@/app/actions";

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export const metadata = {
  title: "ログイン",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo = "/" } = await searchParams;

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">アカウント</p>
        <h1>ログイン・登録</h1>
        <p>閲覧は誰でもできます。投稿、評価、コメントにはログインが必要です。</p>
      </section>

      <section className="auth-grid">
        <form action={signIn} className="stacked-form">
          <h2>
            <LogIn size={20} />
            ログイン
          </h2>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            メールアドレス
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            パスワード
            <input name="password" type="password" required minLength={8} autoComplete="current-password" />
          </label>
          <button type="submit" className="button">
            <LogIn size={17} />
            <span>ログイン</span>
          </button>
        </form>

        <form action={signUp} className="stacked-form">
          <h2>
            <UserPlus size={20} />
            新規登録
          </h2>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            表示名
            <input name="displayName" required autoComplete="name" />
          </label>
          <label>
            ハンドル
            <input name="handle" placeholder="省略可" />
          </label>
          <label>
            メールアドレス
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            パスワード
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button type="submit" className="button secondary">
            <UserPlus size={17} />
            <span>登録</span>
          </button>
        </form>
      </section>

      <div className="note-box">
        <strong>ローカル初期管理者</strong>
        <p>
          初期データ投入後は `admin@example.com` / `change-me-admin-password` で管理者ログインできます。
          公開時は必ず環境変数で管理者メールとパスワードを変更してください。
        </p>
      </div>
    </div>
  );
}
