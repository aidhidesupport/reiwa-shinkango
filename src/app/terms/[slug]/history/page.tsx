import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { revertRevisionWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { diffRevisionJson } from "@/lib/revisions";
import { decodePathSegment } from "@/lib/routing";
import { canEditRecommendations, getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type HistoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: HistoryPageProps) {
  const [rawParams, currentUser] = await Promise.all([params, getCurrentUser()]);
  const slug = decodePathSegment(rawParams.slug);
  const term = await prisma.term.findUnique({
    where: { slug },
    include: {
      senses: {
        include: {
          examples: true,
          recommendations: true,
          proposals: {
            include: {
              recommendations: true,
            },
          },
        },
      },
    },
  });

  if (!term) notFound();

  const entityIds = [
    term.id,
    ...term.senses.map((sense) => sense.id),
    ...term.senses.flatMap((sense) => sense.proposals.map((proposal) => proposal.id)),
    ...term.senses.flatMap((sense) => sense.examples.map((example) => example.id)),
    ...term.senses.flatMap((sense) => sense.recommendations.map((recommendation) => recommendation.id)),
  ];

  const revisions = await prisma.revision.findMany({
    where: {
      entityId: { in: entityIds },
    },
    include: {
      createdBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="page-shell narrow">
      <Link href={`/terms/${term.slug}`} className="text-link">
        <ArrowLeft size={16} />
        {term.headword}へ戻る
      </Link>
      <section className="page-title">
        <p className="eyebrow">変更履歴</p>
        <h1>{term.headword}</h1>
      </section>

      <div className="timeline">
        {revisions.map((revision) => (
          <article key={revision.id} id={`revision-${revision.id}`} className="timeline-item">
            <span>{revision.createdAt.toLocaleString("ja-JP")} / {revision.createdBy.displayName}</span>
            <h2>{revision.reason}</h2>
            <div className="revision-diff">
              <div className="revision-diff-head">
                <span>項目</span>
                <span>変更前</span>
                <span>変更後</span>
              </div>
              {diffRevisionJson(revision.beforeJson, revision.afterJson).map((diff) => (
                <div key={diff.key} className={diff.changed ? "revision-diff-row changed" : "revision-diff-row"}>
                  <strong>{diff.key}</strong>
                  <code>{diff.before}</code>
                  <code>{diff.after}</code>
                </div>
              ))}
            </div>
            {currentUser && canEditRecommendations(currentUser.role) && revision.beforeJson && ["sense", "proposal", "example"].includes(revision.entityType) ? (
              <details className="rollback-details">
                <summary>この変更を差し戻す</summary>
                <ActionForm action={revertRevisionWithState} className="inline-form" pendingMessage="変更を差し戻しています…">
                  <input type="hidden" name="revisionId" value={revision.id} />
                  <input type="hidden" name="returnTo" value={`/terms/${term.slug}/history#revision-${revision.id}`} />
                  <input name="reason" required minLength={5} placeholder="差し戻し理由" />
                  <button type="submit">差し戻す</button>
                </ActionForm>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
