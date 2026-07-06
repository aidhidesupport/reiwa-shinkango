import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SearchBox } from "@/components/SearchBox";
import { normalizeForSearch } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { compareTermSearchResults } from "@/lib/search";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const normalized = normalizeForSearch(query);
  const exampleWhere = {
    OR: [
      { originalSentence: { contains: query } },
      { rewrittenSentence: { contains: query } },
      { contextNote: { contains: query } },
    ],
  };

  const terms = query
    ? await prisma.term.findMany({
        where: {
          OR: [
            { headword: { contains: query } },
            { normalizedHeadword: { contains: normalized } },
            { originalWord: { contains: query.toLowerCase() } },
            { summary: { contains: query } },
            {
              tags: {
                some: {
                  tag: {
                    OR: [{ name: { contains: query } }, { slug: { contains: normalized } }],
                  },
                },
              },
            },
            {
              examples: {
                some: exampleWhere,
              },
            },
            {
              senses: {
                some: {
                  OR: [
                    { title: { contains: query } },
                    { description: { contains: query } },
                    {
                      domain: {
                        is: {
                          OR: [{ name: { contains: query } }, { slug: { contains: normalized } }],
                        },
                      },
                    },
                    {
                      proposals: {
                        some: {
                          OR: [{ text: { contains: query } }, { fitContext: { contains: query } }],
                        },
                      },
                    },
                    { examples: { some: exampleWhere } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          tags: { include: { tag: true } },
          examples: {
            take: 2,
            where: exampleWhere,
            orderBy: { updatedAt: "desc" },
          },
          senses: {
            include: {
              domain: true,
              proposals: {
                take: 3,
                where: { status: { not: "hidden" } },
                orderBy: { updatedAt: "desc" },
              },
              examples: {
                take: 2,
                where: exampleWhere,
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      })
    : [];

  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">検索</p>
        <h1>横文字・訳語案を探す</h1>
        <SearchBox defaultValue={query} autoFocus />
      </section>

      {query && terms.length === 0 ? (
        <EmptyState
          title="まだ登録されていません"
          body={`「${query}」の項目を作成して、最初の訳語案を投稿できます。`}
          actionLabel="項目を作成"
          actionHref={`/terms/new?headword=${encodeURIComponent(query)}`}
        />
      ) : null}

      <div className="search-results">
        {[...terms].sort(compareTermSearchResults(query)).map((term) => {
          const matchedExamples = [
            ...term.examples,
            ...term.senses.flatMap((sense) => sense.examples),
          ].slice(0, 2);
          return (
            <Link key={term.id} href={`/terms/${term.slug}`} className="search-result">
              <div>
                <h2>{term.headword}</h2>
                <p>{term.summary}</p>
                <div className="tag-row">
                  {term.tags.map(({ tag }) => (
                    <span key={tag.id}>{tag.name}</span>
                  ))}
                </div>
                <div className="mini-proposals">
                  {term.senses.flatMap((sense) => sense.proposals).map((proposal) => (
                    <span key={proposal.id}>{proposal.text}</span>
                  ))}
                </div>
                {matchedExamples.length > 0 ? (
                  <div className="usage-snippets">
                    <strong>一致した使用例</strong>
                    {matchedExamples.map((example) => (
                      <span key={example.id}>{example.originalSentence} → {example.rewrittenSentence}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <ArrowRight size={20} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
