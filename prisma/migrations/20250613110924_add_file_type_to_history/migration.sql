/*
  Warnings:

  - The `metaData` column on the `History` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "History" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
DROP COLUMN "metaData",
ADD COLUMN     "metaData" JSON;
