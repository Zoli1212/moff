-- CreateTable
CREATE TABLE "TenantWorker" (
    "id" SERIAL NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleNormalized" TEXT NOT NULL,
    "totalAssigned" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_role_unique_norm" ON "TenantWorker"("tenantEmail", "roleNormalized");
