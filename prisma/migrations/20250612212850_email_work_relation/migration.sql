-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "myWorkId" INTEGER;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_myWorkId_fkey" FOREIGN KEY ("myWorkId") REFERENCES "MyWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
