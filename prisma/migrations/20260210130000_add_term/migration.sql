-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Term_term_year_key" ON "Term"("term", "year");

-- CreateIndex
CREATE INDEX "Term_isActive_idx" ON "Term"("isActive");

-- CreateIndex
CREATE INDEX "Term_year_term_idx" ON "Term"("year", "term");
