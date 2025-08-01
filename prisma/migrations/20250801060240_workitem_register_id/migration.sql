-- AlterTable
ALTER TABLE "WorkItemWorker" ADD COLUMN     "workforceRegistryId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkItemWorker" ADD CONSTRAINT "WorkItemWorker_workforceRegistryId_fkey" FOREIGN KEY ("workforceRegistryId") REFERENCES "WorkforceRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
