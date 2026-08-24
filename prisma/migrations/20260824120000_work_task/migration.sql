-- CreateTable
CREATE TABLE "WorkTask" (
    "id" SERIAL NOT NULL,
    "workId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "workItemId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "trade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "workforceRegistryId" INTEGER,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkTask_workId_status_idx" ON "WorkTask"("workId", "status");

-- CreateIndex
CREATE INDEX "WorkTask_workId_parentId_idx" ON "WorkTask"("workId", "parentId");

-- CreateIndex
CREATE INDEX "WorkTask_tenantEmail_idx" ON "WorkTask"("tenantEmail");

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_workforceRegistryId_fkey" FOREIGN KEY ("workforceRegistryId") REFERENCES "WorkforceRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
