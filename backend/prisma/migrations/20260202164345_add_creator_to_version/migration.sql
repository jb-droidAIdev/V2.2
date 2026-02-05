-- AlterTable
ALTER TABLE "MonitoringFormVersion" ADD COLUMN     "creatorId" TEXT;

-- AddForeignKey
ALTER TABLE "MonitoringFormVersion" ADD CONSTRAINT "MonitoringFormVersion_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
