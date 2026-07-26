import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { completePasswordResetWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { hashPasswordResetToken, isPasswordResetTokenUsable } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: "新しいパスワードを設定",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = (await searchParams).token?.trim() ?? "";
  const validTokenFormat = /^[A-Za-z0-9_-]{40,200}$/.test(token);
  const resetToken = validTokenFormat
    ? await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashPasswordResetToken(token) },
        select: {
          expiresAt: true,
          usedAt: true,
          user: { select: { suspendedAt: true } },
        },
      })
    : null;
  const canReset = Boolean(
    resetToken
    && !resetToken.user.suspendedAt
    && isPasswordResetTokenUsable(resetToken),
  );

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">アカウント</p>
        <h1>新しいパスワードを設定</h1>
        <p>12文字以上の新しいパスワードを2回入力してください。</p>
      </section>

      {canReset ? (
        <ActionForm
          action={completePasswordResetWithState}
          className="stacked-form auth-single-form"
          pendingMessage="パスワードを変更しています…"
        >
          <h2>
            <KeyRound size={20} aria-hidden="true" />
            パスワード変更
          </h2>
          <input type="hidden" name="token" value={token} />
          <label>
            新しいパスワード
            <input
              name="newPassword"
              type="password"
              required
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
            />
          </label>
          <label>
            新しいパスワード（確認）
            <input
              name="confirmation"
              type="password"
              required
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="button">
            <KeyRound size={17} aria-hidden="true" />
            <span>パスワードを変更</span>
          </button>
        </ActionForm>
      ) : (
        <div className="empty-state">
          <h2>再設定リンクを利用できません</h2>
          <p>リンクが無効か、期限切れか、すでに使用されています。もう一度メールを申請してください。</p>
          <Link href="/forgot-password" className="button">再設定メールを申請</Link>
        </div>
      )}

      <div className="document-links">
        <Link href="/login" className="text-link">ログイン画面へ戻る</Link>
      </div>
    </div>
  );
}
