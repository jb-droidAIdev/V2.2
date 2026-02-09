-- DropForeignKey
ALTER TABLE "MonitoringForm" DROP CONSTRAINT "MonitoringForm_campaignId_fkey";

-- AlterTable
ALTER TABLE "MonitoringForm" ADD COLUMN     "teamName" TEXT,
ALTER COLUMN "campaignId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MonitoringForm" ADD CONSTRAINT "MonitoringForm_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
