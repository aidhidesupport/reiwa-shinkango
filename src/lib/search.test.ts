import { describe, expect, it } from "vitest";
import { compareTermSearchResults, scoreTermSearchMatch } from "./search";

describe("term search scoring", () => {
  const exact = {
    headword: "エビデンス",
    normalizedHeadword: "エビデンス",
    originalWord: "evidence",
    updatedAt: new Date("2026-01-01"),
  };

  const related = {
    headword: "コミット",
    normalizedHeadword: "コミット",
    summary: "判断のエビデンスを説明する例を含む項目。",
    updatedAt: new Date("2026-07-01"),
  };

  it("prioritizes exact headword matches over newer partial matches", () => {
    expect([related, exact].sort(compareTermSearchResults("えびでんす"))).toEqual([exact, related]);
  });

  it("matches original words without case sensitivity", () => {
    expect(scoreTermSearchMatch(exact, "EVIDENCE")).toBeGreaterThan(scoreTermSearchMatch(related, "EVIDENCE"));
  });

  it("scores tags, domains, proposals, and examples as searchable fields", () => {
    expect(
      scoreTermSearchMatch(
        {
          headword: "オンボーディング",
          tags: [{ tag: { name: "人材", slug: "人材" } }],
          senses: [
            {
              domain: { name: "人事", slug: "hr" },
              proposals: [{ text: "受け入れ支援", fitContext: "新人研修" }],
              examples: [{ rewrittenSentence: "新入社員の受け入れ支援を改善する。" }],
            },
          ],
        },
        "受け入れ支援",
      ),
    ).toBeGreaterThan(0);
  });
});
