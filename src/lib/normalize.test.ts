import { describe, expect, it } from "vitest";
import { joinLabels, normalizeForSearch, slugifyHeadword, splitLabels } from "./normalize";

describe("normalizeForSearch", () => {
  it("absorbs common kana and separator variants", () => {
    expect(normalizeForSearch("おん・ボーディング")).toBe("オンボーディング");
    expect(normalizeForSearch("オン ボーディング")).toBe("オンボーディング");
    expect(normalizeForSearch("ON-BOARDING")).toBe("onboarding");
  });

  it("creates stable slugs", () => {
    expect(slugifyHeadword("オン・ボーディング")).toBe("オンボーディング");
  });

  it("round-trips evaluation labels", () => {
    expect(splitLabels(joinLabels(["clear", "natural", "clear"]))).toEqual(["clear", "natural"]);
  });
});
