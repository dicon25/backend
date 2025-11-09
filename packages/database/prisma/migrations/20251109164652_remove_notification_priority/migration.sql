/*
  Warnings:

  - The values [BOOKMARK_UPDATE,COMMENT_REPLY,WEEKLY_DIGEST] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `priority` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'DISCUSSION_ACTIVITY', 'SYSTEM');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "priority",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "NotificationPriority";
