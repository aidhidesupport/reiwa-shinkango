import { splitLabels } from "./normalize";

export type EvaluationLike = {
  labelsCsv: string;
};

export type ProposalScoreInput = {
  status: string;
  examples: unknown[];
  evaluations: EvaluationLike[];
};

export type LabelCounts = Record<string, number>;

const RECOMMENDATION_BONUS: Record<string, number> = {
  tentative: 5,
  recommended: 15,
  limited: 8,
  discouraged: -20,
};

export function countLabels(evaluations: EvaluationLike[]) {
  return evaluations.reduce<LabelCounts>((counts, evaluation) => {
    for (const label of splitLabels(evaluation.labelsCsv)) {
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, {});
}

export function scoreProposal(proposal: ProposalScoreInput) {
  const counts = countLabels(proposal.evaluations);
  const recommendationBonus = RECOMMENDATION_BONUS[proposal.status] ?? 0;

  return (
    (counts.natural ?? 0) * 2 +
    (counts.clear ?? 0) * 2 +
    (counts.accurate ?? 0) * 3 +
    (counts.concise ?? 0) +
    (proposal.examples.length > 0 ? 5 : 0) +
    recommendationBonus -
    (counts.meaning_shift ?? 0) * 4 -
    (counts.too_stiff ?? 0) -
    (counts.too_long ?? 0) -
    (counts.too_coined ?? 0)
  );
}

export function sortedByProposalScore<T extends ProposalScoreInput>(proposals: T[]) {
  return [...proposals].sort((a, b) => {
    const scoreDelta = scoreProposal(b) - scoreProposal(a);
    if (scoreDelta !== 0) return scoreDelta;
    return b.evaluations.length - a.evaluations.length;
  });
}
