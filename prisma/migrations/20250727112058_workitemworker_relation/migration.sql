-- CreateTable
CREATE TABLE "WorkItemWorker" (
    "id" SERIAL NOT NULL,
    "workItemId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkItemWorker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkItemWorker" ADD CONSTRAINT "WorkItemWorker_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemWorker" ADD CONSTRAINT "WorkItemWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
