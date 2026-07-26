import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, BarChart3, MessageSquare, Quote, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SearchBox } from "@/components/SearchBox";
import { normalizeForSearch } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import {
  compareProposalSearchResults,
  compareTermSearchResults,
  proposalEvaluationScore,
  scoreProposalSearchMatch,
  type SearchSort,
} from "@/lib/search";
import { uniqueTagsFromSenses } from "@/lib/tags";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "検索",
  robots: {
    index: false,
    follow: true,
  },
};

type SearchScope = "all" | "terms" | "proposals";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    scope?: string;
    domain?: string;
    tag?: string;
    sort?: string;
  }>;
};

const searchScopes = new Set<SearchScope>(["all", "terms", "proposals"]);
const searchSorts = new Set<SearchSort>(["relevance", "popular", "newest", "evaluation"]);

const sortLabels: Record<SearchSort, string> = {
  relevance: "関連度順",
  popular: "人気順",
  newest: "新着順",
  evaluation: "評価順",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const normalized = normalizeForSearch(query);
  const scope = searchScopes.has(params.scope as SearchScope) ? params.scope as SearchScope : "all";
  const domainSlug = (params.domain ?? "").trim();
  const tagSlug = (params.tag ?? "").trim();
  const sort = searchSorts.has(params.sort as SearchSort) ? params.sort as SearchSort : "relevance";
  const hasSearchCondition = Boolean(query || domainSlug || tagSlug);

  const exampleWhere: Prisma.UsageExampleWhereInput = {
    status: { not: "hidden" },
    OR: [
      { originalSentence: { contains: query } },
      { rewrittenSentence: { contains: query } },
      { contextNote: { contains: query } },
    ],
  };
  const proposalQueryConditions: Prisma.TranslationProposalWhereInput[] = [
    { text: { contains: query } },
    { fitContext: { contains: query } },
    { rationale: { contains: query } },
    { examples: { some: exampleWhere } },
  ];
  const termQueryConditions: Prisma.TermWhereInput[] = [
    { headword: { contains: query } },
    { normalizedHeadword: { contains: normalized } },
    { originalWord: { contains: query.toLowerCase() } },
    { summary: { contains: query } },
    { examples: { some: exampleWhere } },
    {
      senses: {
        some: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { examples: { some: exampleWhere } },
          ],
        },
      },
    },
  ];

  const queryCondition: Prisma.TermWhereInput | null = !query
    ? null
    : scope === "terms"
      ? { OR: termQueryConditions }
      : scope === "proposals"
        ? {
            senses: {
              some: {
                proposals: {
                  some: {
                    status: { not: "hidden" },
                    OR: proposalQueryConditions,
                  },
                },
              },
            },
          }
        : {
            OR: [
              ...termQueryConditions,
              {
                senses: {
                  some: {
                    OR: [
                      {
                        domain: {
                          is: {
                            OR: [{ name: { contains: query } }, { slug: { contains: normalized } }],
                          },
                        },
                      },
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
                        proposals: {
                          some: {
                            status: { not: "hidden" },
                            OR: proposalQueryConditions,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          };

  const termFilters: Prisma.TermWhereInput[] = [{ status: "published" }];
  const senseFilters: Prisma.SenseWhereInput[] = [];
  if (domainSlug) senseFilters.push({ domain: { is: { slug: domainSlug } } });
  if (tagSlug) senseFilters.push({ tags: { some: { tag: { slug: tagSlug } } } });
  if (query && scope === "proposals") {
    termFilters.push({
      senses: {
        some: {
          AND: [
            ...senseFilters,
            {
              proposals: {
                some: {
                  status: { not: "hidden" },
                  OR: proposalQueryConditions,
                },
              },
            },
          ],
        },
      },
    });
  } else {
    if (queryCondition) termFilters.push(queryCondition);
  }
  if (senseFilters.length > 0 && !(query && scope === "proposals")) {
    termFilters.push({
      senses: {
        some: { AND: senseFilters },
      },
    });
  }

  const [domains, tags, terms] = await Promise.all([
    prisma.domain.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    hasSearchCondition
      ? prisma.term.findMany({
          where: { AND: termFilters },
          include: {
            examples: {
              take: 2,
              where: query ? exampleWhere : { id: "__no_matching_example__" },
              orderBy: { updatedAt: "desc" },
            },
            senses: {
              where: senseFilters.length > 0 ? { AND: senseFilters } : undefined,
              include: {
                domain: true,
                tags: { include: { tag: true } },
                proposals: {
                  where: { status: { not: "hidden" } },
                  include: {
                    evaluations: true,
                    examples: {
                      where: { status: { not: "hidden" } },
                    },
                    comments: {
                      where: { status: { not: "hidden" } },
                      select: { id: true },
                    },
                  },
                  orderBy: { updatedAt: "desc" },
                },
                examples: {
                  take: 2,
                  where: query ? exampleWhere : { id: "__no_matching_example__" },
                  orderBy: { updatedAt: "desc" },
                },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }],
        })
      : [],
  ]);

  const sortedTerms = [...terms].sort(compareTermSearchResults(query, sort));

  return (
    <div className="page-shell search-page">
      <section className="page-title">
        <p className="eyebrow">検索</p>
        <h1>横文字・日本語案を探す</h1>
        <p>言葉から探すことも、日本語案から逆引きすることもできます。</p>
        <SearchBox
          defaultValue={query}
          autoFocus
          filters={{
            scope,
            domain: domainSlug,
            tag: tagSlug,
            sort,
            domains,
            tags,
          }}
        />
      </section>

      {!hasSearchCondition ? (
        <EmptyState
          title="検索語か絞り込み条件を指定してください"
          body="横文字、日本語案、使う場面を入力するか、分野・タグを選ぶと候補を表示します。"
        />
      ) : null}

      {hasSearchCondition && terms.length === 0 ? (
        <EmptyState
          title="条件に合う項目はまだありません"
          body={query
            ? `「${query}」と選択した条件に合う使われ方や日本語案は見つかりませんでした。`
            : "選択した分野・タグに合う使われ方や日本語案は見つかりませんでした。"}
          actionLabel={query ? "項目を作成" : undefined}
          actionHref={query ? `/terms/new?headword=${encodeURIComponent(query)}` : undefined}
        />
      ) : null}

      {sortedTerms.length > 0 ? (
        <section className="search-result-section" aria-labelledby="search-result-heading">
          <header className="search-results-summary">
            <div>
              <p className="eyebrow">検索結果</p>
              <h2 id="search-result-heading">{sortedTerms.length}件の言葉</h2>
            </div>
            <p>{sortLabels[sort]}。各カードでは日本語案を大きく表示しています。</p>
          </header>

          <div className="search-results">
            {sortedTerms.map((term) => {
              const tagsForTerm = uniqueTagsFromSenses(term.senses);
              const matchedExamples = query
                ? [
                    ...new Map(
                      [...term.examples, ...term.senses.flatMap((sense) => sense.examples)]
                        .map((example) => [example.id, example]),
                    ).values(),
                  ].slice(0, 2)
                : [];
              const proposals = term.senses
                .flatMap((sense) =>
                  sense.proposals.map((proposal) => ({
                    ...proposal,
                    senseTitle: sense.title,
                    domainName: sense.domain?.name ?? "未分類",
                  })),
                )
                .filter((proposal) =>
                  scope === "proposals" && query ? scoreProposalSearchMatch(proposal, query) > 0 : true,
                )
                .sort(compareProposalSearchResults(query, sort))
                .slice(0, 4);

              return (
                <article key={term.id} className="search-result">
                  <header className="search-result-head">
                    <div>
                      <span className="search-term-label">取り上げている言葉</span>
                      <h2>
                        <Link href={`/terms/${term.slug}`}>{term.headword}</Link>
                      </h2>
                      {term.originalWord ? <span className="search-original-word">{term.originalWord}</span> : null}
                    </div>
                    <Link href={`/terms/${term.slug}`} className="icon-link">
                      <span>項目全体を見る</span>
                      <ArrowRight size={17} />
                    </Link>
                  </header>
                  <p className="search-term-summary">{term.summary}</p>

                  <div className="search-result-taxonomy">
                    {[...new Set(term.senses.map((sense) => sense.domain?.name).filter(Boolean))].map((domain) => (
                      <span key={domain} className="domain-chip">{domain}</span>
                    ))}
                    {tagsForTerm.slice(0, 6).map((tag) => (
                      <span key={tag.id} className="tag-chip">{tag.name}</span>
                    ))}
                  </div>

                  {proposals.length > 0 ? (
                    <div className="search-proposal-results">
                      {proposals.map((proposal) => (
                        <Link
                          key={proposal.id}
                          href={`/terms/${term.slug}#proposal-${proposal.id}`}
                          className="search-proposal-hit"
                        >
                          <span className="search-proposal-kicker">
                            日本語案 / {proposal.domainName} / {proposal.senseTitle}
                          </span>
                          <h3>{proposal.text}</h3>
                          <div className="search-proposal-context">
                            <strong>合う場面</strong>
                            <p>{proposal.fitContext}</p>
                          </div>
                          <div className="search-proposal-metrics">
                            <span>
                              <BarChart3 size={14} />
                              参考スコア {proposalEvaluationScore(proposal)}
                            </span>
                            <span>
                              <Users size={14} />
                              評価 {proposal.evaluations.length}人
                            </span>
                            <span>
                              <MessageSquare size={14} />
                              議論 {proposal.comments.length}件
                            </span>
                            <span>
                              <Quote size={14} />
                              使用例 {proposal.examples.length}件
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link href={`/terms/${term.slug}`} className="search-no-proposal">
                      この条件で表示できる日本語案はありません。項目全体で使われ方を確認する
                      <ArrowRight size={16} />
                    </Link>
                  )}

                  {matchedExamples.length > 0 ? (
                    <div className="usage-snippets">
                      <strong>一致した使用例</strong>
                      {matchedExamples.map((example) => (
                        <span key={example.id}>{example.originalSentence} → {example.rewrittenSentence}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
