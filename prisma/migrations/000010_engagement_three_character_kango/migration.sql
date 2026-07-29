UPDATE "UsageExample"
SET
  "rewrittenSentence" = '社員の熱意度を高める。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "rewrittenSentence" = '社員の働きがいを高める。'
  AND "termId" IN (
    SELECT "id" FROM "Term" WHERE "slug" = 'engagement'
  );

UPDATE "UsageExample"
SET
  "rewrittenSentence" = '組織への愛着度を測る調査を実施する。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "rewrittenSentence" = '組織への愛着を測る調査を実施する。'
  AND "termId" IN (
    SELECT "id" FROM "Term" WHERE "slug" = 'engagement'
  );

UPDATE "TranslationProposal"
SET
  "text" = '熱意度',
  "rationale" = '仕事に向ける活力、熱意、没頭の強さを、漢字三字で簡潔に示せる。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "text" = '働きがい'
  AND "senseId" IN (
    SELECT "Sense"."id"
    FROM "Sense"
    INNER JOIN "Term" ON "Term"."id" = "Sense"."termId"
    WHERE "Term"."slug" = 'engagement'
  );

UPDATE "TranslationProposal"
SET
  "text" = '愛着度',
  "rationale" = '組織への心理的な結びつきの強さを、漢字三字で簡潔に示せる。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "text" = '組織への愛着'
  AND "senseId" IN (
    SELECT "Sense"."id"
    FROM "Sense"
    INNER JOIN "Term" ON "Term"."id" = "Sense"."termId"
    WHERE "Term"."slug" = 'engagement'
  );

UPDATE "Sense"
SET
  "title" = '職務熱意と組織愛着',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "title" = '組織への愛着や働きがい'
  AND "termId" IN (
    SELECT "id" FROM "Term" WHERE "slug" = 'engagement'
  );
