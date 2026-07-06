import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { diffRevisionJson } from "@/lib/revisions";
import { prisma } from "@/lib/prisma";

type HistoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { slug } = await params;
  const term = await prisma.term.findUnique({
    where: { slug },
    include: {
      senses: {
        include: {
          proposals: true,
        },
      },
    },
  });

  if (!term) notFound();

  const entityIds = [
    term.id,
    ...term.senses.map((sense) => sense.id),
    ...term.senses.flatMap((sense) => sense.proposals.map((proposal) => proposal.id)),
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
          <article key={revision.id} className="timeline-item">
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
          </article>
        ))}
      </div>
    </div>
  );
}
