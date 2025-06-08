/*
  Warnings:

  - The primary key for the `Email` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `attachments` on the `Email` table. All the data in the column will be lost.
  - The `id` column on the `Email` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[gmailId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gmailId` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Made the column `from` on table `Email` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subject` on table `Email` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Email" DROP CONSTRAINT "Email_pkey",
DROP COLUMN "attachments",
ADD COLUMN     "attachmentFilenames" TEXT[],
ADD COLUMN     "gmailId" TEXT NOT NULL,
ADD COLUMN     "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "from" SET NOT NULL,
ALTER COLUMN "subject" SET NOT NULL,
ADD CONSTRAINT "Email_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Email_gmailId_key" ON "Email"("gmailId");
