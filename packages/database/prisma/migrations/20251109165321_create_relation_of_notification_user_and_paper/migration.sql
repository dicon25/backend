-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedPaperId_fkey" FOREIGN KEY ("relatedPaperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
