-- CreateTable
CREATE TABLE "Billing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "offerId" INTEGER NOT NULL,
    "items" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "tenantEmail" TEXT NOT NULL DEFAULT '',
    "invoiceNumber" TEXT,
    "issuedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
