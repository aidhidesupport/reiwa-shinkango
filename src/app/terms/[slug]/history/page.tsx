import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { revertRevisionWithState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { diffRevisionJson, revisionEntityLabel } from "@/lib/revisions";
import { decodePathSegment } from "@/lib/routing";
import { canModerate, canRevertRevisions, getCurrentUser } from "@/lib/session";
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
          recommendations: {
            include: { proposal: true },
          },
          proposals: {
            include: {
              comments: true,
              recommendations: true,
            },
          },
        },
      },
    },
  });

  if (!term) {
    const termRedirect = await prisma.termRedirect.findUnique({
      where: { sourceSlug: slug },
      include: { targetTerm: { select: { slug: true } } },
    });
    if (termRedirect) {
      permanentRedirect(`/terms/${encodeURIComponent(termRedirect.targetTerm.slug)}/history`);
    }
    notFound();
  }
  if (term.status !== "published" && (!currentUser || !canModerate(currentUser.role))) {
    notFound();
  }

  const domains = await prisma.domain.findMany({
    select: { id: true, name: true },
  });
  const domainNames = new Map(domains.map((domain) => [domain.id, domain.name]));
  const entityIds = [
    term.id,
    ...term.senses.map((sense) => sense.id),
    ...term.senses.flatMap((sense) => sense.proposals.map((proposal) => proposal.id)),
    ...term.senses.flatMap((sense) => sense.examples.map((example) => example.id)),
    ...term.senses.flatMap((sense) => sense.recommendations.map((recommendation) => recommendation.id)),
    ...term.senses.flatMap((sense) =>
      sense.proposals.flatMap((proposal) => proposal.comments.map((comment) => comment.id))),
  ];
  const targetLabels = new Map<string, string>([[`term:${term.id}`, term.headword]]);
  for (const sense of term.senses) {
    targetLabels.set(`sense:${sense.id}`, sense.title);
    for (const proposal of sense.proposals) {
      targetLabels.set(`proposal:${proposal.id}`, proposal.text);
      for (const comment of proposal.comments) {
        targetLabels.set(`comment:${comment.id}`, comment.body);
      }
    }
    for (const example of sense.examples) {
      targetLabels.set(`example:${example.id}`, example.rewrittenSentence);
    }
    for (const recommendation of sense.recommendations) {
      targetLabels.set(`recommendation:${recommendation.id}`, recommendation.proposal.text);
    }
  }

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
            <p className="revision-target">
              {revisionEntityLabel(revision.entityType)}:{" "}
              {targetLabels.get(`${revision.entityType}:${revision.entityId}`) ?? term.headword}
            </p>
            <h2>{revision.reason}</h2>
            <div className="revision-diff">
              <div className="revision-diff-head">
                <span>項目</span>
                <span>変更前</span>
                <span>変更後</span>
              </div>
              {diffRevisionJson(revision.beforeJson, revision.afterJson, {
                entityType: revision.entityType,
                domainNames,
              }).map((diff) => (
                <div key={diff.key} className={diff.changed ? "revision-diff-row changed" : "revision-diff-row"}>
                  <strong>{diff.label}</strong>
                  <span>{diff.before}</span>
                  <span>{diff.after}</span>
                </div>
              ))}
            </div>
            {currentUser && canRevertRevisions(currentUser.role) && revision.beforeJson && ["sense", "proposal", "example"].includes(revision.entityType) ? (
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
