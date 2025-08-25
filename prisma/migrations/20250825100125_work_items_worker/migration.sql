-- AlterTable
ALTER TABLE "WorkDiaryItem" ADD COLUMN     "name" TEXT,
ADD COLUMN     "workItemWorkerId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkDiaryItem" ADD CONSTRAINT "WorkDiaryItem_workItemWorkerId_fkey" FOREIGN KEY ("workItemWorkerId") REFERENCES "WorkItemWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
