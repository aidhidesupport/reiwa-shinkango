import { describe, expect, it } from "vitest";
import { countLabels, scoreProposal } from "./scoring";

describe("proposal scoring", () => {
  it("counts evaluation labels", () => {
    expect(countLabels([{ labelsCsv: "natural,clear" }, { labelsCsv: "clear" }])).toEqual({
      natural: 1,
      clear: 2,
    });
  });

  it("rewards examples and recommendation status while penalizing meaning shifts", () => {
    const score = scoreProposal({
      status: "recommended",
      examples: [{}],
      evaluations: [{ labelsCsv: "natural,accurate,meaning_shift" }],
    });

    expect(score).toBe(21);
  });
});
