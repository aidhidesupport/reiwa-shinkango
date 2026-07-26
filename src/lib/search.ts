import { normalizeForSearch } from "./normalize";
import { scoreProposal } from "./scoring";

type SearchText = string | null | undefined;

type SearchableExample = {
  originalSentence?: SearchText;
  rewrittenSentence?: SearchText;
  contextNote?: SearchText;
};

export type SearchSort = "relevance" | "popular" | "newest" | "evaluation";

export type SearchableProposal = {
  text?: SearchText;
  fitContext?: SearchText;
  rationale?: SearchText;
  status?: string;
  updatedAt?: Date | string | null;
  examples?: SearchableExample[];
  evaluations?: Array<{ labelsCsv: string }>;
  comments?: unknown[];
};

export type SearchableTerm = {
  headword: string;
  normalizedHeadword?: SearchText;
  originalWord?: SearchText;
  summary?: SearchText;
  updatedAt?: Date | string | null;
  examples?: SearchableExample[];
  senses?: Array<{
    title?: SearchText;
    description?: SearchText;
    domain?: {
      name?: SearchText;
      slug?: SearchText;
    } | null;
    tags?: Array<{
      tag: {
        name: string;
        slug?: SearchText;
      };
    }>;
    proposals?: SearchableProposal[];
    examples?: SearchableExample[];
  }>;
};

function normalizedIncludes(value: SearchText, query: string) {
  return Boolean(value && normalizeForSearch(value).includes(query));
}

function normalizedEquals(value: SearchText, query: string) {
  return Boolean(value && normalizeForSearch(value) === query);
}

function newestFirst(a: SearchableTerm, b: SearchableTerm) {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bTime - aTime;
}

function proposalNewestFirst(a: SearchableProposal, b: SearchableProposal) {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bTime - aTime;
}

function proposalsFromTerm(term: SearchableTerm) {
  return (term.senses ?? []).flatMap((sense) => sense.proposals ?? []);
}

export function scoreProposalSearchMatch(proposal: SearchableProposal, rawQuery: string) {
  const query = normalizeForSearch(rawQuery);
  if (!query) return 0;
  if (normalizedEquals(proposal.text, query)) return 700;
  if (normalizedIncludes(proposal.text, query)) return 540;
  if (normalizedIncludes(proposal.fitContext, query)) return 380;
  if (normalizedIncludes(proposal.rationale, query)) return 360;
  for (const example of proposal.examples ?? []) {
    if (normalizedIncludes(example.originalSentence, query) || normalizedIncludes(example.rewrittenSentence, query)) {
      return 460;
    }
    if (normalizedIncludes(example.contextNote, query)) return 360;
  }
  return 0;
}

export function proposalPopularity(proposal: SearchableProposal) {
  return (
    (proposal.evaluations?.length ?? 0) * 3 +
    (proposal.comments?.length ?? 0) * 2 +
    (proposal.examples?.length ?? 0)
  );
}

export function proposalEvaluationScore(proposal: SearchableProposal) {
  return scoreProposal({
    status: proposal.status ?? "active",
    examples: proposal.examples ?? [],
    evaluations: proposal.evaluations ?? [],
  });
}

export function compareProposalSearchResults(rawQuery: string, sort: SearchSort = "relevance") {
  return (a: SearchableProposal, b: SearchableProposal) => {
    if (sort === "popular") {
      return proposalPopularity(b) - proposalPopularity(a) || proposalNewestFirst(a, b);
    }
    if (sort === "newest") return proposalNewestFirst(a, b);
    if (sort === "evaluation") {
      return proposalEvaluationScore(b) - proposalEvaluationScore(a) || proposalNewestFirst(a, b);
    }
    return (
      scoreProposalSearchMatch(b, rawQuery) - scoreProposalSearchMatch(a, rawQuery) ||
      proposalNewestFirst(a, b)
    );
  };
}

export function scoreTermSearchMatch(term: SearchableTerm, rawQuery: string) {
  const query = normalizeForSearch(rawQuery);
  if (!query) return 0;

  let score = 0;
  const keep = (candidate: number) => {
    score = Math.max(score, candidate);
  };

  if (normalizedEquals(term.normalizedHeadword ?? term.headword, query)) keep(1000);
  if (normalizedEquals(term.originalWord, query)) keep(920);
  if (normalizedIncludes(term.normalizedHeadword ?? term.headword, query)) keep(760);
  if (normalizedIncludes(term.originalWord, query)) keep(720);
  if (normalizedIncludes(term.summary, query)) keep(360);

  for (const example of term.examples ?? []) {
    if (normalizedIncludes(example.originalSentence, query) || normalizedIncludes(example.rewrittenSentence, query)) {
      keep(460);
    }
    if (normalizedIncludes(example.contextNote, query)) keep(360);
  }

  for (const sense of term.senses ?? []) {
    for (const { tag } of sense.tags ?? []) {
      if (normalizedEquals(tag.name, query) || normalizedEquals(tag.slug, query)) keep(680);
      if (normalizedIncludes(tag.name, query) || normalizedIncludes(tag.slug, query)) keep(520);
    }
    if (normalizedEquals(sense.domain?.name, query) || normalizedEquals(sense.domain?.slug, query)) keep(640);
    if (normalizedIncludes(sense.domain?.name, query) || normalizedIncludes(sense.domain?.slug, query)) keep(500);
    if (normalizedIncludes(sense.title, query)) keep(440);
    if (normalizedIncludes(sense.description, query)) keep(340);

    for (const proposal of sense.proposals ?? []) {
      if (normalizedEquals(proposal.text, query)) keep(700);
      if (normalizedIncludes(proposal.text, query)) keep(540);
      if (normalizedIncludes(proposal.fitContext, query)) keep(380);
    }

    for (const example of sense.examples ?? []) {
      if (normalizedIncludes(example.originalSentence, query) || normalizedIncludes(example.rewrittenSentence, query)) {
        keep(460);
      }
      if (normalizedIncludes(example.contextNote, query)) keep(360);
    }
  }

  return score;
}

export function compareTermSearchResults(rawQuery: string, sort: SearchSort = "relevance") {
  return (a: SearchableTerm, b: SearchableTerm) => {
    if (sort === "popular") {
      const popularity = (term: SearchableTerm) =>
        proposalsFromTerm(term).reduce((sum, proposal) => sum + proposalPopularity(proposal), 0);
      return popularity(b) - popularity(a) || newestFirst(a, b) || a.headword.localeCompare(b.headword, "ja");
    }
    if (sort === "newest") return newestFirst(a, b) || a.headword.localeCompare(b.headword, "ja");
    if (sort === "evaluation") {
      const evaluationScore = (term: SearchableTerm) =>
        Math.max(0, ...proposalsFromTerm(term).map(proposalEvaluationScore));
      return (
        evaluationScore(b) - evaluationScore(a) ||
        newestFirst(a, b) ||
        a.headword.localeCompare(b.headword, "ja")
      );
    }
    const scoreDiff = scoreTermSearchMatch(b, rawQuery) - scoreTermSearchMatch(a, rawQuery);
    return scoreDiff || newestFirst(a, b) || a.headword.localeCompare(b.headword, "ja");
  };
}
