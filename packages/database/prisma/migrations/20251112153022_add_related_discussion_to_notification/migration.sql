-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "relatedDiscussionId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedDiscussionId_fkey" FOREIGN KEY ("relatedDiscussionId") REFERENCES "Discussion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
