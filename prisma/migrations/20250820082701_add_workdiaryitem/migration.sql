/*
  Warnings:

  - You are about to drop the column `quantity` on the `WorkDiary` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `WorkDiary` table. All the data in the column will be lost.
  - You are about to drop the column `workHours` on the `WorkDiary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkDiary" DROP COLUMN "quantity",
DROP COLUMN "unit",
DROP COLUMN "workHours";

-- CreateTable
CREATE TABLE "WorkDiaryItem" (
    "id" SERIAL NOT NULL,
    "diaryId" INTEGER NOT NULL,
    "workId" INTEGER NOT NULL,
    "workItemId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION,
    "workHours" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "images" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDiaryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDiaryItem_diaryId_workId_workItemId_workerId_date_key" ON "WorkDiaryItem"("diaryId", "workId", "workItemId", "workerId", "date");

-- AddForeignKey
ALTER TABLE "WorkDiaryItem" ADD CONSTRAINT "WorkDiaryItem_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "WorkDiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDiaryItem" ADD CONSTRAINT "WorkDiaryItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDiaryItem" ADD CONSTRAINT "WorkDiaryItem_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDiaryItem" ADD CONSTRAINT "WorkDiaryItem_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
