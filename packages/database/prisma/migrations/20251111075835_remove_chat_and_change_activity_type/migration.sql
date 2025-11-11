/*
  Warnings:

  - The values [VIEW_PAPER,REACT] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('STAY_LONG_TIME', 'REACT_LIKE', 'REACT_UNLIKE', 'START_DISCUSSION', 'JOIN_DISCUSSION', 'CHAT_DISCUSSION', 'CHAT_MESSAGE');
ALTER TABLE "UserActivity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_chatSessionId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_paperId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_userId_fkey";

-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "translatedHashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "ChatSession";

-- DropEnum
DROP TYPE "ChatMessageRole";
