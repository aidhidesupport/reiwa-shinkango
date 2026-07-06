import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type DomainPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function DomainPage({ params }: DomainPageProps) {
  const { slug } = await params;
  const domain = await prisma.domain.findUnique({
    where: { slug },
    include: {
      senses: {
        include: {
          term: true,
          proposals: {
            take: 3,
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  if (!domain) notFound();

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">分野</p>
        <h1>{domain.name}</h1>
        {domain.description ? <p>{domain.description}</p> : null}
      </section>
      <div className="search-results">
        {domain.senses.map((sense) => (
          <Link key={sense.id} href={`/terms/${sense.term.slug}`} className="search-result">
            <div>
              <h2>{sense.term.headword}</h2>
              <p>{sense.title}: {sense.description}</p>
              <div className="mini-proposals">
                {sense.proposals.map((proposal) => (
                  <span key={proposal.id}>{proposal.text}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
