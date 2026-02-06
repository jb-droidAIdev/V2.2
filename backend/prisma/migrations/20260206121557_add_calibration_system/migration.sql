/*
  Warnings:

  - The values [OPEN,PENDING_QA_TL_REVIEW,PENDING_JOINT_REVIEW,CLOSED_VALID,CLOSED_INVALID,CLOSED_REJECTED] on the enum `DisputeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `scoreJson` on the `CalibrationScore` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CalibrationScore` table. All the data in the column will be lost.
  - The `status` column on the `CalibrationSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `raisedBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the `DisputeDecision` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[auditId,fieldName]` on the table `AuditFieldValue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[auditId,criterionId]` on the table `AuditScore` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionId,userId]` on the table `CalibrationParticipant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticketId,participantId]` on the table `CalibrationScore` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `CalibrationParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participantId` to the `CalibrationScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalScore` to the `CalibrationScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campaignId` to the `CalibrationSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `CalibrationSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CalibrationSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raisedById` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `DisputeItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisputeVerdict" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CalibrationSessionStatus" AS ENUM ('SCHEDULED', 'ANCHOR_PENDING', 'SCORING_OPEN', 'SCORING_CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CalibrationTicketType" AS ENUM ('REPRODUCIBILITY', 'REPEATABILITY', 'ACCURACY');

-- CreateEnum
CREATE TYPE "CalibrationAnchorStatus" AS ENUM ('PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'NON_MATCHING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "AuditStatus" ADD VALUE 'REAPPEALED';

-- AlterEnum
BEGIN;
CREATE TYPE "DisputeStatus_new" AS ENUM ('PENDING_QA_REVIEW', 'QA_REJECTED', 'REAPPEALED', 'FINALIZED');
ALTER TABLE "Dispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Dispute" ALTER COLUMN "status" TYPE "DisputeStatus_new" USING ("status"::text::"DisputeStatus_new");
ALTER TYPE "DisputeStatus" RENAME TO "DisputeStatus_old";
ALTER TYPE "DisputeStatus_new" RENAME TO "DisputeStatus";
DROP TYPE "DisputeStatus_old";
ALTER TABLE "Dispute" ALTER COLUMN "status" SET DEFAULT 'PENDING_QA_REVIEW';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'QA_MANAGER';
ALTER TYPE "Role" ADD VALUE 'OPS_MANAGER';
ALTER TYPE "Role" ADD VALUE 'SDM';

-- DropForeignKey
ALTER TABLE "CalibrationParticipant" DROP CONSTRAINT "CalibrationParticipant_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "CalibrationScore" DROP CONSTRAINT "CalibrationScore_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_raisedBy_fkey";

-- DropForeignKey
ALTER TABLE "DisputeDecision" DROP CONSTRAINT "DisputeDecision_decidedBy_fkey";

-- DropForeignKey
ALTER TABLE "DisputeDecision" DROP CONSTRAINT "DisputeDecision_disputeId_fkey";

-- AlterTable
ALTER TABLE "AuditScore" ADD COLUMN     "categoryLabel" TEXT,
ADD COLUMN     "criterionTitle" TEXT;

-- AlterTable
ALTER TABLE "CalibrationParticipant" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hasCompletedScoring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CalibrationScore" DROP COLUMN "scoreJson",
DROP COLUMN "userId",
ADD COLUMN     "participantId" TEXT NOT NULL,
ADD COLUMN     "scoreDetails" JSONB,
ADD COLUMN     "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalScore" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "CalibrationSession" ADD COLUMN     "accuracyTicketCount" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "avgAccuracyGap" DOUBLE PRECISION,
ADD COLUMN     "avgRepeatability" DOUBLE PRECISION,
ADD COLUMN     "avgReproducibility" DOUBLE PRECISION,
ADD COLUMN     "calculatedRnR" DOUBLE PRECISION,
ADD COLUMN     "campaignId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "highScoreMax" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "highScoreMin" DOUBLE PRECISION NOT NULL DEFAULT 95,
ADD COLUMN     "lowScoreMax" DOUBLE PRECISION NOT NULL DEFAULT 87,
ADD COLUMN     "lowScoreMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "midScoreMax" DOUBLE PRECISION NOT NULL DEFAULT 94,
ADD COLUMN     "midScoreMin" DOUBLE PRECISION NOT NULL DEFAULT 88,
ADD COLUMN     "repeatabilityTicketCount" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "reproducibilityTicketCount" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "resultsPublishedAt" TIMESTAMP(3),
ADD COLUMN     "scoringClosedAt" TIMESTAMP(3),
ADD COLUMN     "scoringOpenedAt" TIMESTAMP(3),
ADD COLUMN     "targetAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "targetRnR" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
ADD COLUMN     "totalRange" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CalibrationSessionStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "type" "CampaignType" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "raisedBy",
DROP COLUMN "reason",
ADD COLUMN     "raisedById" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING_QA_REVIEW';

-- AlterTable
ALTER TABLE "DisputeItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "finalComment" TEXT,
ADD COLUMN     "finalVerdict" "DisputeVerdict",
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedById" TEXT,
ADD COLUMN     "qaComment" TEXT,
ADD COLUMN     "qaReviewedAt" TIMESTAMP(3),
ADD COLUMN     "qaReviewedById" TEXT,
ADD COLUMN     "qaVerdict" "DisputeVerdict",
ADD COLUMN     "reappealReason" TEXT,
ADD COLUMN     "reappealedAt" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FormCriterion" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MonitoringFormVersion" ADD COLUMN     "changeLog" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockoutUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "DisputeDecision";

-- CreateTable
CREATE TABLE "CalibrationTicket" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "auditId" TEXT,
    "ticketId" TEXT NOT NULL,
    "type" "CalibrationTicketType" NOT NULL,
    "passNumber" INTEGER,
    "groupId" TEXT,
    "scoreRange" TEXT,
    "anchorScore" DOUBLE PRECISION,
    "agentName" TEXT,
    "channel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationAnchor" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "scoreRange" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "CalibrationAnchorStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "qaTlApproved" BOOLEAN,
    "qaTlApprovedBy" TEXT,
    "qaTlApprovedAt" TIMESTAMP(3),
    "amSdmApproved" BOOLEAN,
    "amSdmApprovedBy" TEXT,
    "amSdmApprovedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalibrationAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "avgReproducibility" DOUBLE PRECISION,
    "avgRepeatability" DOUBLE PRECISION,
    "avgAccuracyGap" DOUBLE PRECISION,
    "accuracyByRange" JSONB,
    "totalRange" DOUBLE PRECISION,
    "calculatedRnR" DOUBLE PRECISION,
    "passedRnR" BOOLEAN,
    "passedAccuracy" BOOLEAN,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalibrationResult_sessionId_userId_key" ON "CalibrationResult"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditFieldValue_auditId_fieldName_key" ON "AuditFieldValue"("auditId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "AuditScore_auditId_criterionId_key" ON "AuditScore"("auditId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "CalibrationParticipant_sessionId_userId_key" ON "CalibrationParticipant"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalibrationScore_ticketId_participantId_key" ON "CalibrationScore"("ticketId", "participantId");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeItem" ADD CONSTRAINT "DisputeItem_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "FormCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationSession" ADD CONSTRAINT "CalibrationSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationSession" ADD CONSTRAINT "CalibrationSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationParticipant" ADD CONSTRAINT "CalibrationParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationTicket" ADD CONSTRAINT "CalibrationTicket_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationTicket" ADD CONSTRAINT "CalibrationTicket_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationScore" ADD CONSTRAINT "CalibrationScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationScore" ADD CONSTRAINT "CalibrationScore_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "CalibrationTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationScore" ADD CONSTRAINT "CalibrationScore_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CalibrationParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationAnchor" ADD CONSTRAINT "CalibrationAnchor_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationAnchor" ADD CONSTRAINT "CalibrationAnchor_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationAnchor" ADD CONSTRAINT "CalibrationAnchor_qaTlApprovedBy_fkey" FOREIGN KEY ("qaTlApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationAnchor" ADD CONSTRAINT "CalibrationAnchor_amSdmApprovedBy_fkey" FOREIGN KEY ("amSdmApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationResult" ADD CONSTRAINT "CalibrationResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationResult" ADD CONSTRAINT "CalibrationResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
