import { describe, expect, it } from "vitest";
import {
  compareProposalSearchResults,
  compareTermSearchResults,
  proposalEvaluationScore,
  proposalPopularity,
  scoreProposalSearchMatch,
  scoreTermSearchMatch,
} from "./search";

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
          senses: [
            {
              domain: { name: "人事", slug: "hr" },
              tags: [{ tag: { name: "人材", slug: "人材" } }],
              proposals: [{ text: "受け入れ支援", fitContext: "新人研修" }],
              examples: [{ rewrittenSentence: "新入社員の受け入れ支援を改善する。" }],
            },
          ],
        },
        "受け入れ支援",
      ),
    ).toBeGreaterThan(0);
  });

  it("orders Japanese proposals by relevance, popularity, and evaluation score", () => {
    const exactProposal = {
      text: "反応度",
      fitContext: "SNS分析",
      status: "active",
      updatedAt: new Date("2026-01-01"),
      examples: [{}],
      evaluations: [{ labelsCsv: "natural,clear,accurate" }],
      comments: [],
    };
    const popularProposal = {
      text: "関与度",
      fitContext: "利用者の反応を調べる分析",
      status: "active",
      updatedAt: new Date("2026-07-01"),
      examples: [],
      evaluations: [{ labelsCsv: "too_stiff" }],
      comments: [{}, {}, {}],
    };

    expect(scoreProposalSearchMatch(exactProposal, "反応度")).toBeGreaterThan(
      scoreProposalSearchMatch(popularProposal, "反応度"),
    );
    expect(proposalPopularity(popularProposal)).toBeGreaterThan(proposalPopularity(exactProposal));
    expect(proposalEvaluationScore(exactProposal)).toBeGreaterThan(proposalEvaluationScore(popularProposal));
    expect(
      [popularProposal, exactProposal].sort(compareProposalSearchResults("反応度", "relevance")),
    ).toEqual([exactProposal, popularProposal]);
    expect(
      [exactProposal, popularProposal].sort(compareProposalSearchResults("", "popular")),
    ).toEqual([popularProposal, exactProposal]);
    expect(
      [popularProposal, exactProposal].sort(compareProposalSearchResults("", "evaluation")),
    ).toEqual([exactProposal, popularProposal]);
  });

  it("orders terms by the strongest proposal when evaluation order is selected", () => {
    const strongTerm = {
      headword: "エンゲージメント",
      senses: [{
        proposals: [{
          text: "反応度",
          status: "recommended",
          examples: [{}],
          evaluations: [{ labelsCsv: "natural,clear,accurate" }],
        }],
      }],
    };
    const weakTerm = {
      headword: "コミットメント",
      senses: [{
        proposals: [{
          text: "関与",
          status: "active",
          examples: [],
          evaluations: [{ labelsCsv: "meaning_shift" }],
        }],
      }],
    };

    expect([weakTerm, strongTerm].sort(compareTermSearchResults("", "evaluation"))).toEqual([
      strongTerm,
      weakTerm,
    ]);
  });
});
