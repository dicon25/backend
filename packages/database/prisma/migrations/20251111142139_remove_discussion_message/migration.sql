/*
  Warnings:

  - You are about to drop the column `likeCount` on the `DiscussionMessage` table. All the data in the column will be lost.
  - You are about to drop the `DiscussionMessageLike` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiscussionMessageLike" DROP CONSTRAINT "DiscussionMessageLike_messageId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionMessageLike" DROP CONSTRAINT "DiscussionMessageLike_userId_fkey";

-- AlterTable
ALTER TABLE "DiscussionMessage" DROP COLUMN "likeCount";

-- DropTable
DROP TABLE "DiscussionMessageLike";
