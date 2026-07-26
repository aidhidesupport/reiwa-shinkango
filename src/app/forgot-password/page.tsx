import Link from "next/link";
import { Mail } from "lucide-react";
import { requestPasswordResetWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";

export const metadata = {
  title: "パスワードを忘れた方",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">アカウント</p>
        <h1>パスワードを再設定する</h1>
        <p>
          登録したメールアドレスを入力してください。
          該当するアカウントがある場合、30分間有効な再設定リンクを送ります。
        </p>
      </section>

      <ActionForm
        action={requestPasswordResetWithState}
        className="stacked-form auth-single-form"
        pendingMessage="再設定メールを準備しています…"
      >
        <h2>
          <Mail size={20} aria-hidden="true" />
          再設定メールを申請
        </h2>
        <label>
          メールアドレス
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        <button type="submit" className="button">
          <Mail size={17} aria-hidden="true" />
          <span>再設定メールを送る</span>
        </button>
      </ActionForm>

      <div className="document-links">
        <Link href="/login" className="text-link">ログイン画面へ戻る</Link>
      </div>
    </div>
  );
}
