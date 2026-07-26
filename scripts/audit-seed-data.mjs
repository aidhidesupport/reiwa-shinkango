import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function list(items) {
  return items.length > 0 ? items.map((item) => `  - ${item}`).join("\n") : "  - なし";
}

function normalizeComparable(input) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000・･/_‐‑‒–—―.,、。・:：;；()[\]「」『』【】]/g, "")
    .trim();
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

async function main() {
  const [terms, domains, tags] = await Promise.all([
    prisma.term.findMany({
      orderBy: { headword: "asc" },
      include: {
        senses: {
          include: {
            domain: true,
            proposals: {
              include: {
                examples: true,
              },
            },
          },
        },
      },
    }),
    prisma.domain.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { senses: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { senses: true } } },
    }),
  ]);

  const senses = terms.flatMap((term) =>
    term.senses.map((sense) => ({ ...sense, term })),
  );
  const proposals = senses.flatMap((sense) =>
    sense.proposals.map((proposal) => ({ ...proposal, sense })),
  );
  const examples = proposals.flatMap((proposal) =>
    proposal.examples.map((example) => ({ ...example, proposal })),
  );

  const termsWithTooFewProposals = terms
    .map((term) => ({
      term,
      count: term.senses.reduce((sum, sense) => sum + sense.proposals.length, 0),
    }))
    .filter(({ count }) => count < 2)
    .map(({ term, count }) => `${term.headword}: ${count}案`);

  const duplicateTerms = [...groupBy(terms, (term) => term.normalizedHeadword).values()]
    .filter((group) => group.length > 1)
    .map((group) => group.map((term) => term.headword).join(" / "));

  const duplicateOriginalWords = [
    ...groupBy(
      terms.filter((term) => term.originalWord?.trim()),
      (term) => normalizeComparable(term.originalWord),
    ).values(),
  ]
    .filter((group) => group.length > 1)
    .map((group) => `${group[0].originalWord}: ${group.map((term) => term.headword).join(" / ")}`);

  const duplicateProposalsWithinSense = senses.flatMap((sense) =>
    [...groupBy(sense.proposals, (proposal) => normalizeComparable(proposal.text)).values()]
      .filter((group) => group.length > 1)
      .map((group) => `${sense.term.headword} / ${sense.title}: ${group[0].text}`),
  );

  const unchangedProposals = proposals
    .filter((proposal) => proposal.text.trim() === proposal.sense.term.headword.trim())
    .map((proposal) => `${proposal.sense.term.headword}: ${proposal.text}`);

  const missingFitContexts = proposals
    .filter((proposal) => !proposal.fitContext.trim())
    .map((proposal) => `${proposal.sense.term.headword}: ${proposal.text}`);

  const missingRationales = proposals
    .filter((proposal) => !proposal.rationale?.trim())
    .map((proposal) => `${proposal.sense.term.headword}: ${proposal.text}`);

  const proposalsWithoutExamples = proposals
    .filter((proposal) => proposal.examples.length === 0)
    .map((proposal) => `${proposal.sense.term.headword}: ${proposal.text}`);

  const unchangedExamples = examples
    .filter((example) => example.originalSentence.trim() === example.rewrittenSentence.trim())
    .map((example) =>
      `${example.proposal.sense.term.headword} / ${example.proposal.text}: ${example.originalSentence}`,
    );

  const genericConfirmExamples = examples.filter(
    (example) =>
      example.originalSentence === `${example.proposal.sense.term.headword}を確認する。`,
  );
  const genericReviewExamples = examples.filter(
    (example) =>
      example.originalSentence === `${example.proposal.sense.term.headword}を見直す。`,
  );

  const crossTermProposalDuplicates = [
    ...groupBy(proposals, (proposal) => normalizeComparable(proposal.text)).values(),
  ]
    .filter((group) => new Set(group.map((proposal) => proposal.sense.term.id)).size > 1)
    .map((group) => {
      const headwords = [...new Set(group.map((proposal) => proposal.sense.term.headword))];
      return `${group[0].text}: ${headwords.join(" / ")}`;
    });

  const nearCrossTermProposalPairs = [];
  const seenNearPairs = new Set();
  for (let leftIndex = 0; leftIndex < proposals.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < proposals.length; rightIndex += 1) {
      const left = proposals[leftIndex];
      const right = proposals[rightIndex];
      if (left.sense.term.id === right.sense.term.id) continue;

      const normalizedLeft = normalizeComparable(left.text);
      const normalizedRight = normalizeComparable(right.text);
      const longestLength = Math.max(normalizedLeft.length, normalizedRight.length);
      if (normalizedLeft === normalizedRight || longestLength < 3) continue;

      const similarity =
        1 - editDistance(normalizedLeft, normalizedRight) / longestLength;
      if (similarity < 0.66) continue;

      const labels = [
        `${left.sense.term.headword}: ${left.text}`,
        `${right.sense.term.headword}: ${right.text}`,
      ].sort();
      const pairKey = labels.join("|");
      if (seenNearPairs.has(pairKey)) continue;
      seenNearPairs.add(pairKey);
      nearCrossTermProposalPairs.push(`${labels.join(" ↔ ")}（類似度 ${similarity.toFixed(2)}）`);
    }
  }

  const unusedDomains = domains
    .filter((domain) => domain._count.senses === 0)
    .map((domain) => domain.name);
  const unusedTags = tags
    .filter((tag) => tag._count.senses === 0)
    .map((tag) => tag.name);

  const criticalIssues = [
    ...termsWithTooFewProposals,
    ...duplicateTerms,
    ...duplicateOriginalWords,
    ...duplicateProposalsWithinSense,
    ...unchangedProposals,
    ...missingFitContexts,
    ...missingRationales,
    ...proposalsWithoutExamples,
    ...unchangedExamples,
  ];

  console.log("# 初期データ監査");
  console.log("");
  console.log(`- 項目: ${terms.length}`);
  console.log(`- 使われ方: ${senses.length}`);
  console.log(`- 日本語案: ${proposals.length}`);
  console.log(`- 使用例: ${examples.length}`);
  console.log(`- 重大な指摘: ${criticalIssues.length}`);
  console.log("");
  console.log("## 重大な指摘");
  console.log(list(criticalIssues));
  console.log("");
  console.log("## 品質レビュー対象");
  console.log(`- 「確認する」共通テンプレート例文: ${genericConfirmExamples.length}件`);
  console.log(`- 「見直す」共通テンプレート例文: ${genericReviewExamples.length}件`);
  console.log("- 複数項目で重複する日本語案:");
  console.log(list(crossTermProposalDuplicates));
  console.log("- 表記が近い日本語案（意味と利用場面を編集確認）:");
  console.log(list(nearCrossTermProposalPairs));
  console.log("- 使用実績のない分野:");
  console.log(list(unusedDomains));
  console.log("- 使用実績のないタグ:");
  console.log(list(unusedTags));

  if (criticalIssues.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
