-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'QA', 'QA_TL', 'OPS_TL', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'PENDING_QA_TL_REVIEW', 'PENDING_JOINT_REVIEW', 'CLOSED_VALID', 'CLOSED_INVALID', 'CLOSED_REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AUDIT_RELEASED', 'DISPUTE_OPENED', 'DISPUTE_UPDATED', 'SLA_WARNING', 'SLA_BREACH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "samplingRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "stratification" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignQA" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignQA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringForm" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringFormVersion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "MonitoringFormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormCriterion" (
    "id" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FormCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketUploadBatch" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TicketUploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedTicket" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalTicketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "interactionDate" TIMESTAMP(3) NOT NULL,
    "channel" TEXT,
    "metadata" JSONB,

    CONSTRAINT "UploadedTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SamplingRun" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configUsed" JSONB NOT NULL,

    CONSTRAINT "SamplingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampledTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assignedQaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',

    CONSTRAINT "SampledTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sampledTicketId" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'DRAFT',
    "score" DOUBLE PRECISION,
    "isAutoFailed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "agentAckDeadline" TIMESTAMP(3),
    "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFieldValue" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AuditFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditScore" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "isFailed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AuditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseRecord" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedBy" TEXT,

    CONSTRAINT "ReleaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeItem" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,

    CONSTRAINT "DisputeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeDecision" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "CalibrationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CalibrationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationScore" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "scoreJson" JSONB NOT NULL,

    CONSTRAINT "CalibrationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricRevisionQueueItem" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricRevisionQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignQA_campaignId_userId_key" ON "CampaignQA"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SampledTicket_ticketId_key" ON "SampledTicket"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_sampledTicketId_key" ON "Audit"("sampledTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseRecord_auditId_key" ON "ReleaseRecord"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_auditId_key" ON "Dispute"("auditId");

-- AddForeignKey
ALTER TABLE "CampaignQA" ADD CONSTRAINT "CampaignQA_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignQA" ADD CONSTRAINT "CampaignQA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringForm" ADD CONSTRAINT "MonitoringForm_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringFormVersion" ADD CONSTRAINT "MonitoringFormVersion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "MonitoringForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCriterion" ADD CONSTRAINT "FormCriterion_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "MonitoringFormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketUploadBatch" ADD CONSTRAINT "TicketUploadBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketUploadBatch" ADD CONSTRAINT "TicketUploadBatch_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedTicket" ADD CONSTRAINT "UploadedTicket_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketUploadBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedTicket" ADD CONSTRAINT "UploadedTicket_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SamplingRun" ADD CONSTRAINT "SamplingRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SamplingRun" ADD CONSTRAINT "SamplingRun_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketUploadBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampledTicket" ADD CONSTRAINT "SampledTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "UploadedTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampledTicket" ADD CONSTRAINT "SampledTicket_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SamplingRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_sampledTicketId_fkey" FOREIGN KEY ("sampledTicketId") REFERENCES "SampledTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "MonitoringFormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFieldValue" ADD CONSTRAINT "AuditFieldValue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditScore" ADD CONSTRAINT "AuditScore_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditScore" ADD CONSTRAINT "AuditScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "FormCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRecord" ADD CONSTRAINT "ReleaseRecord_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeItem" ADD CONSTRAINT "DisputeItem_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeDecision" ADD CONSTRAINT "DisputeDecision_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeDecision" ADD CONSTRAINT "DisputeDecision_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationParticipant" ADD CONSTRAINT "CalibrationParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationParticipant" ADD CONSTRAINT "CalibrationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationScore" ADD CONSTRAINT "CalibrationScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
