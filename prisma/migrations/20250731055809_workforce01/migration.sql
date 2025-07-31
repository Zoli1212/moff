-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "inProgress" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WorkforceRegistry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contactInfo" TEXT,
    "hiredDate" TIMESTAMP(3),
    "leftDate" TIMESTAMP(3),
    "currentlyAvailable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkforceRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentRegistry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "currentlyAvailable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EquipmentRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRegistry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "currentlyAvailable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "supplier" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MaterialRegistry_pkey" PRIMARY KEY ("id")
);
