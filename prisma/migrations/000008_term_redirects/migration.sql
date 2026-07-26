-- CreateTable
CREATE TABLE "TermRedirect" (
    "id" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "sourceHeadword" TEXT NOT NULL,
    "targetTermId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "mergedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermRedirect_sourceSlug_key" ON "TermRedirect"("sourceSlug");

-- CreateIndex
CREATE INDEX "TermRedirect_targetTermId_idx" ON "TermRedirect"("targetTermId");

-- AddForeignKey
ALTER TABLE "TermRedirect" ADD CONSTRAINT "TermRedirect_targetTermId_fkey"
FOREIGN KEY ("targetTermId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermRedirect" ADD CONSTRAINT "TermRedirect_mergedById_fkey"
FOREIGN KEY ("mergedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
