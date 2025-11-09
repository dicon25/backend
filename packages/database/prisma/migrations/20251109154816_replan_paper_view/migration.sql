/*
  Warnings:

  - You are about to drop the column `durationSeconds` on the `PaperView` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `PaperView` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `PaperView` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaperView" DROP COLUMN "durationSeconds",
DROP COLUMN "ipAddress",
DROP COLUMN "userAgent";
