-- Move tags from the whole term to each of its senses.
BEGIN;

CREATE TABLE "SenseTag" (
    "senseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SenseTag_pkey" PRIMARY KEY ("senseId","tagId")
);

INSERT INTO "SenseTag" ("senseId", "tagId")
SELECT "Sense"."id", "TermTag"."tagId"
FROM "TermTag"
INNER JOIN "Sense" ON "Sense"."termId" = "TermTag"."termId";

ALTER TABLE "SenseTag" ADD CONSTRAINT "SenseTag_senseId_fkey"
FOREIGN KEY ("senseId") REFERENCES "Sense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SenseTag" ADD CONSTRAINT "SenseTag_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "TermTag";

COMMIT;
