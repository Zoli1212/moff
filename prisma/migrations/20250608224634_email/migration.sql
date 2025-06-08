-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "from" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);
