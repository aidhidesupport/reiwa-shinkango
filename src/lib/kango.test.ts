import { describe, expect, it } from "vitest";
import { isKangoProposalText } from "./kango";

describe("isKangoProposalText", () => {
  it.each(["反応度", "関与度", "熱意度", "愛着度", "説明責任"])(
    "漢字だけで表記した漢語「%s」を受け付ける",
    (value) => {
      expect(isKangoProposalText(value)).toBe(true);
    },
  );

  it.each([
    "働きがい",
    "投稿への反応",
    "エンゲージメント",
    "説明 責任",
    "accountability",
    "",
  ])("漢語案として扱えない「%s」を拒否する", (value) => {
    expect(isKangoProposalText(value)).toBe(false);
  });
});
