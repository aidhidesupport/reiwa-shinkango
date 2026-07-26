import { describe, expect, it } from "vitest";
import { termMergeConfirmation } from "./term-merge";

describe("termMergeConfirmation", () => {
  it("統合元と統合先の向きを確認文へ残す", () => {
    expect(termMergeConfirmation("統合元", "統合先")).toBe("統合元 → 統合先 に統合");
  });
});
