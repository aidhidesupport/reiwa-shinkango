import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { confirmEmailVerificationWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import {
  hashEmailVerificationToken,
  isEmailVerificationTokenUsable,
} from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: "メールアドレスを確認",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = (await searchParams).token?.trim() ?? "";
  const validTokenFormat = /^[A-Za-z0-9_-]{40,200}$/.test(token);
  const verificationToken = validTokenFormat
    ? await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: hashEmailVerificationToken(token) },
        select: {
          expiresAt: true,
          usedAt: true,
          user: { select: { suspendedAt: true } },
        },
      })
    : null;
  const canVerify = Boolean(
    verificationToken
    && !verificationToken.user.suspendedAt
    && isEmailVerificationTokenUsable(verificationToken),
  );

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">アカウント</p>
        <h1>メールアドレスを確認</h1>
        <p>確認すると、日本語案の投稿、評価、コメントなどの参加機能を使えるようになります。</p>
      </section>

      {canVerify ? (
        <ActionForm
          action={confirmEmailVerificationWithState}
          className="stacked-form auth-single-form"
          pendingMessage="メールアドレスを確認しています…"
        >
          <h2>
            <MailCheck size={20} aria-hidden="true" />
            確認を完了する
          </h2>
          <input type="hidden" name="token" value={token} />
          <p className="muted">ボタンを押すと、この確認リンクは使用済みになります。</p>
          <button type="submit" className="button">
            <MailCheck size={17} aria-hidden="true" />
            <span>メールアドレスを確認</span>
          </button>
        </ActionForm>
      ) : (
        <div className="empty-state">
          <h2>確認リンクを利用できません</h2>
          <p>リンクが無効か、期限切れか、すでに使用されています。アカウント画面から確認メールを再送してください。</p>
          <Link href="/account" className="button">アカウント画面へ</Link>
        </div>
      )}

      <div className="document-links">
        <Link href="/account" className="text-link">アカウント画面へ戻る</Link>
      </div>
    </div>
  );
}
