-- CreateTable
CREATE TABLE "PriceList" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "laborCost" INTEGER NOT NULL,
    "materialCost" INTEGER NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_task_tenantEmail_key" ON "PriceList"("task", "tenantEmail");
