-- AlterTable
ALTER TABLE "sections" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "sections_courseId_orderIndex_idx" ON "sections"("courseId", "orderIndex");

-- CreateIndex
CREATE INDEX "chapters_sectionId_orderIndex_idx" ON "chapters"("sectionId", "orderIndex");
