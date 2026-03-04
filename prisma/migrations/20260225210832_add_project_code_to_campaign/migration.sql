/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "AuditStatus" ADD VALUE 'ACKNOWLEDGED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "projectCode" TEXT;

-- AlterTable
ALTER TABLE "CampaignQA" ADD COLUMN     "formId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CampaignQA" ADD CONSTRAINT "CampaignQA_formId_fkey" FOREIGN KEY ("formId") REFERENCES "MonitoringForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
