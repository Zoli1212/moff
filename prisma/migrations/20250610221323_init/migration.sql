-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
    "gmailId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "attachmentFilenames" TEXT[],
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION DEFAULT 1,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "PriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "recordId" TEXT NOT NULL,
    "content" JSONB,
    "userEmail" TEXT,
    "createdAt" TEXT,
    "aiAgentType" TEXT,
    "metaData" TEXT,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "demand" TEXT NOT NULL,
    "offer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyWork" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "MyWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyInvoices" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sellerName" TEXT NOT NULL,
    "sellerTaxNumber" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerTaxNumber" TEXT NOT NULL,
    "netAmount" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "vatAmount" DOUBLE PRECISION,
    "grossAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'HUF',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantEmail" TEXT NOT NULL,

    CONSTRAINT "MyInvoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "myPrompt" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "myPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleOAuthCredential" (
    "id" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "auth_uri" TEXT NOT NULL,
    "token_uri" TEXT NOT NULL,
    "auth_provider_x509_cert_url" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "redirect_uris" JSONB NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleOAuthCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Email_gmailId_key" ON "Email"("gmailId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
