/*
  Warnings:

  - A unique constraint covering the columns `[recordId]` on the table `Offer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[recordId]` on the table `Offer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "materialTotal" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "tenantEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "workTotal" DOUBLE PRECISION DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "unique_offer_record_id" ON "Offer"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_recordId_key" ON "Offer"("recordId");
