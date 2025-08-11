-- CreateTable
CREATE TABLE "WorkToolsRegistry" (
    "id" SERIAL NOT NULL,
    "workId" INTEGER NOT NULL,
    "toolId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkToolsRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkToolsRegistry_workId_toolId_key" ON "WorkToolsRegistry"("workId", "toolId");

-- AddForeignKey
ALTER TABLE "WorkToolsRegistry" ADD CONSTRAINT "WorkToolsRegistry_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkToolsRegistry" ADD CONSTRAINT "WorkToolsRegistry_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "ToolsRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
