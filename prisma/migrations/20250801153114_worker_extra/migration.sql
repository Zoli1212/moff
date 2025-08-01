/*
  Warnings:

  - You are about to drop the column `extraData` on the `Worker` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WorkItemWorker" ADD COLUMN     "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "extraData",
ADD COLUMN     "workers" JSONB;
