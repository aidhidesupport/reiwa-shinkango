PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS "EditSuggestion";
DROP TABLE IF EXISTS "Report";
DROP TABLE IF EXISTS "Revision";
DROP TABLE IF EXISTS "Recommendation";
DROP TABLE IF EXISTS "Comment";
DROP TABLE IF EXISTS "Evaluation";
DROP TABLE IF EXISTS "UsageExample";
DROP TABLE IF EXISTS "TranslationProposal";
DROP TABLE IF EXISTS "Sense";
DROP TABLE IF EXISTS "TermTag";
DROP TABLE IF EXISTS "Term";
DROP TABLE IF EXISTS "Tag";
DROP TABLE IF EXISTS "Domain";
DROP TABLE IF EXISTS "User";

PRAGMA foreign_keys = ON;

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "email" TEXT,
  "passwordHash" TEXT,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  "role" TEXT NOT NULL DEFAULT 'user',
  "reputation" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "suspendedAt" DATETIME
);

CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Domain" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

CREATE TABLE "Term" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "headword" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "normalizedHeadword" TEXT NOT NULL,
  "reading" TEXT,
  "originalWord" TEXT,
  "summary" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Term_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Term_slug_key" ON "Term"("slug");
CREATE INDEX "Term_normalizedHeadword_idx" ON "Term"("normalizedHeadword");

CREATE TABLE "TermTag" (
  "termId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  PRIMARY KEY ("termId", "tagId"),
  CONSTRAINT "TermTag_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TermTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Sense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "termId" TEXT NOT NULL,
  "domainId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "usageNote" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Sense_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Sense_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Sense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TranslationProposal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "senseId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "reading" TEXT,
  "fitContext" TEXT NOT NULL,
  "unfitContext" TEXT,
  "rationale" TEXT,
  "pros" TEXT,
  "cons" TEXT,
  "register" TEXT NOT NULL DEFAULT 'neutral',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TranslationProposal_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "Sense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TranslationProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "UsageExample" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "termId" TEXT NOT NULL,
  "senseId" TEXT NOT NULL,
  "proposalId" TEXT,
  "originalSentence" TEXT NOT NULL,
  "rewrittenSentence" TEXT NOT NULL,
  "contextNote" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'original',
  "sourceUrl" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "UsageExample_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageExample_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "Sense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageExample_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TranslationProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "UsageExample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Evaluation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "proposalId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "labelsCsv" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Evaluation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TranslationProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Evaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Evaluation_proposalId_userId_key" ON "Evaluation"("proposalId", "userId");

CREATE TABLE "Comment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "proposalId" TEXT,
  "termId" TEXT,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TranslationProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Recommendation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "senseId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "representativeExampleId" TEXT,
  "decidedById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Recommendation_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "Sense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Recommendation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TranslationProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Recommendation_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Revision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeJson" TEXT,
  "afterJson" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Revision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Revision_entityType_entityId_idx" ON "Revision"("entityType", "entityId");

CREATE TABLE "Report" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "detail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "EditSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "proposedJson" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  CONSTRAINT "EditSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EditSuggestion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "EditSuggestion_status_createdAt_idx" ON "EditSuggestion"("status", "createdAt");
CREATE INDEX "EditSuggestion_targetType_targetId_idx" ON "EditSuggestion"("targetType", "targetId");
