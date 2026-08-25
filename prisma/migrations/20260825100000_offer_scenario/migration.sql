-- CreateTable
CREATE TABLE "OfferScenario" (
    "id" SERIAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    "constraint" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "baseTotalPrice" DOUBLE PRECISION NOT NULL,
    "baseDurationText" TEXT,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferScenario_offerId_idx" ON "OfferScenario"("offerId");

-- CreateIndex
CREATE INDEX "OfferScenario_tenantEmail_idx" ON "OfferScenario"("tenantEmail");

-- AddForeignKey
ALTER TABLE "OfferScenario" ADD CONSTRAINT "OfferScenario_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
