import { normalizeForSearch } from "./normalize";

type SearchText = string | null | undefined;

type SearchableExample = {
  originalSentence?: SearchText;
  rewrittenSentence?: SearchText;
  contextNote?: SearchText;
};

export type SearchableTerm = {
  headword: string;
  normalizedHeadword?: SearchText;
  originalWord?: SearchText;
  summary?: SearchText;
  updatedAt?: Date | string | null;
  tags?: Array<{
    tag: {
      name: string;
      slug?: SearchText;
    };
  }>;
  examples?: SearchableExample[];
  senses?: Array<{
    title?: SearchText;
    description?: SearchText;
    domain?: {
      name?: SearchText;
      slug?: SearchText;
    } | null;
    proposals?: Array<{
      text?: SearchText;
      fitContext?: SearchText;
    }>;
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

  for (const { tag } of term.tags ?? []) {
    if (normalizedEquals(tag.name, query) || normalizedEquals(tag.slug, query)) keep(680);
    if (normalizedIncludes(tag.name, query) || normalizedIncludes(tag.slug, query)) keep(520);
  }

  for (const example of term.examples ?? []) {
    if (normalizedIncludes(example.originalSentence, query) || normalizedIncludes(example.rewrittenSentence, query)) {
      keep(460);
    }
    if (normalizedIncludes(example.contextNote, query)) keep(360);
  }

  for (const sense of term.senses ?? []) {
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

export function compareTermSearchResults(rawQuery: string) {
  return (a: SearchableTerm, b: SearchableTerm) => {
    const scoreDiff = scoreTermSearchMatch(b, rawQuery) - scoreTermSearchMatch(a, rawQuery);
    return scoreDiff || newestFirst(a, b) || a.headword.localeCompare(b.headword, "ja");
  };
}

