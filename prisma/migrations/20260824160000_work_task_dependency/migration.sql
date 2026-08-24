-- CreateTable
CREATE TABLE "WorkTaskDependency" (
    "id" SERIAL NOT NULL,
    "workId" INTEGER NOT NULL,
    "predecessorId" INTEGER NOT NULL,
    "successorId" INTEGER NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkTaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkTaskDependency_workId_idx" ON "WorkTaskDependency"("workId");

-- CreateIndex
CREATE INDEX "WorkTaskDependency_tenantEmail_idx" ON "WorkTaskDependency"("tenantEmail");

-- CreateIndex
CREATE UNIQUE INDEX "WorkTaskDependency_predecessorId_successorId_key" ON "WorkTaskDependency"("predecessorId", "successorId");

-- AddForeignKey
ALTER TABLE "WorkTaskDependency" ADD CONSTRAINT "WorkTaskDependency_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTaskDependency" ADD CONSTRAINT "WorkTaskDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTaskDependency" ADD CONSTRAINT "WorkTaskDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
