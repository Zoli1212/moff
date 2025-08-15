-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "availableFull" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availableQuantity" INTEGER NOT NULL DEFAULT 0;
