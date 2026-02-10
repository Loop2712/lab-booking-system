-- Add termId relation to Section and backfill from term/year
ALTER TABLE "Section" ADD COLUMN "termId" TEXT;

UPDATE "Section" s
SET "termId" = t.id
FROM "Term" t
WHERE s.term IS NOT NULL
  AND s.year IS NOT NULL
  AND t.term = s.term
  AND t.year = s.year;

ALTER TABLE "Section"
ADD CONSTRAINT "Section_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Section_termId_idx" ON "Section"("termId");

ALTER TABLE "Section" DROP COLUMN "term";
ALTER TABLE "Section" DROP COLUMN "year";
