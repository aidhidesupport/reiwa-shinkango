import Link from "next/link";
import { ArrowLeft, ArrowRight, GitMerge } from "lucide-react";
import { mergeTermsWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { canMergeTerms, getCurrentUser } from "@/lib/session";
import { termMergeConfirmation } from "@/lib/term-merge";

type MergePageProps = {
  searchParams: Promise<{
    source?: string;
    target?: string;
  }>;
};

export const metadata = {
  title: "重複項目の統合",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function MergePage({ searchParams }: MergePageProps) {
  const [currentUser, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser || !canMergeTerms(currentUser.role)) {
    return (
      <div className="page-shell narrow">
        <EmptyState
          title="編集者専用です"
          body="重複項目の統合は編集者または管理者だけが行えます。"
          actionLabel="トップへ戻る"
          actionHref="/"
        />
      </div>
    );
  }

  const terms = await prisma.term.findMany({
    where: { status: "published" },
    orderBy: [{ headword: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: {
          senses: true,
          examples: true,
          redirects: true,
        },
      },
    },
  });
  const source = terms.find((term) => term.id === params.source);
  const target = terms.find((term) => term.id === params.target);
  const sameTerm = source && target && source.id === target.id;
  const [sourceProposalCount, sourceEvaluationCount, sourceCommentCount] = source && !sameTerm
    ? await Promise.all([
        prisma.translationProposal.count({
          where: { sense: { is: { termId: source.id } } },
        }),
        prisma.evaluation.count({
          where: { proposal: { is: { sense: { is: { termId: source.id } } } } },
        }),
        prisma.comment.count({
          where: {
            OR: [
              { termId: source.id },
              { proposal: { is: { sense: { is: { termId: source.id } } } } },
            ],
          },
        }),
      ])
    : [0, 0, 0];
  const confirmation = source && target && !sameTerm
    ? termMergeConfirmation(source.headword, target.headword)
    : "";

  return (
    <div className="page-shell narrow">
      <Link href="/dashboard" className="text-link">
        <ArrowLeft size={16} aria-hidden="true" />
        編集者ダッシュボードへ戻る
      </Link>

      <section className="page-title">
        <p className="eyebrow">Merge terms</p>
        <h1>重複項目を統合</h1>
        <p>統合元の内容をすべて統合先へ移し、元のURLは統合先へ転送します。</p>
      </section>

      <form action="/dashboard/merge" method="get" className="merge-selector">
        <label>
          統合元（統合後に項目を削除）
          <select name="source" required defaultValue={source?.id ?? ""}>
            <option value="">選択してください</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.headword}（使われ方 {term._count.senses}件）
              </option>
            ))}
          </select>
        </label>
        <ArrowRight size={20} aria-hidden="true" />
        <label>
          統合先（残す項目）
          <select name="target" required defaultValue={target?.id ?? ""}>
            <option value="">選択してください</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.headword}（使われ方 {term._count.senses}件）
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button secondary">内容を比較</button>
      </form>

      {sameTerm ? (
        <p className="notice warning">統合元と統合先には別の項目を選んでください。</p>
      ) : null}

      {source && target && !sameTerm ? (
        <>
          <section className="merge-preview" aria-label="統合内容の確認">
            <article className="merge-term-card source">
              <p className="eyebrow">統合元・削除される項目</p>
              <h2>{source.headword}</h2>
              <p>{source.summary}</p>
              <dl>
                <div><dt>使われ方</dt><dd>{source._count.senses}</dd></div>
                <div><dt>日本語案</dt><dd>{sourceProposalCount}</dd></div>
                <div><dt>使用例</dt><dd>{source._count.examples}</dd></div>
                <div><dt>評価</dt><dd>{sourceEvaluationCount}</dd></div>
                <div><dt>コメント</dt><dd>{sourceCommentCount}</dd></div>
                <div><dt>旧URL転送</dt><dd>{source._count.redirects}</dd></div>
              </dl>
              <Link href={`/terms/${source.slug}`} className="text-link">統合元を確認</Link>
            </article>

            <div className="merge-direction" aria-hidden="true">
              <GitMerge size={26} />
              <ArrowRight size={22} />
            </div>

            <article className="merge-term-card target">
              <p className="eyebrow">統合先・残す項目</p>
              <h2>{target.headword}</h2>
              <p>{target.summary}</p>
              <dl>
                <div><dt>現在の使われ方</dt><dd>{target._count.senses}</dd></div>
                <div><dt>統合後の使われ方</dt><dd>{target._count.senses + source._count.senses}</dd></div>
                <div><dt>現在の使用例</dt><dd>{target._count.examples}</dd></div>
                <div><dt>統合後の使用例</dt><dd>{target._count.examples + source._count.examples}</dd></div>
              </dl>
              <Link href={`/terms/${target.slug}`} className="text-link">統合先を確認</Link>
            </article>
          </section>

          <section className="merge-consequences">
            <h2>統合すると起きること</h2>
            <ul>
              <li>統合元の使われ方、日本語案、使用例、評価、コメントは統合先へ移ります。</li>
              <li>統合元の変更履歴と未処理通報も統合先へ引き継ぎます。</li>
              <li>統合元のURLは統合先へ恒久転送され、新しい項目には再利用しません。</li>
              <li>統合操作そのものを統合先の変更履歴へ記録します。</li>
            </ul>
          </section>

          <ActionForm
            action={mergeTermsWithState}
            className="stacked-form merge-confirmation-form"
            pendingMessage="項目を統合しています…"
          >
            <h2>統合を確定</h2>
            <input type="hidden" name="sourceTermId" value={source.id} />
            <input type="hidden" name="targetTermId" value={target.id} />
            <label>
              統合理由
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                placeholder="同じ概念・使われ方が重複しているため"
              />
            </label>
            <label>
              確認のため「{confirmation}」と入力
              <input
                name="confirmation"
                required
                autoComplete="off"
              />
            </label>
            <button type="submit" className="button danger-button">
              <GitMerge size={17} aria-hidden="true" />
              統合を実行
            </button>
          </ActionForm>
        </>
      ) : null}
    </div>
  );
}
