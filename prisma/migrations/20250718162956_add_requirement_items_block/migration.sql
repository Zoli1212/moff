-- CreateTable
CREATE TABLE "RequirementItemsBlock" (
    "id" SERIAL NOT NULL,
    "requirementId" INTEGER NOT NULL,
    "blockText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementItemsBlock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RequirementItemsBlock" ADD CONSTRAINT "RequirementItemsBlock_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
