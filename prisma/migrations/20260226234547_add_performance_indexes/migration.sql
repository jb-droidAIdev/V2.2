-- CreateIndex
CREATE INDEX "Audit_campaignId_idx" ON "Audit"("campaignId");

-- CreateIndex
CREATE INDEX "Audit_auditorId_idx" ON "Audit"("auditorId");

-- CreateIndex
CREATE INDEX "Audit_agentId_idx" ON "Audit"("agentId");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Audit_startedAt_idx" ON "Audit"("startedAt");

-- CreateIndex
CREATE INDEX "Audit_submittedAt_idx" ON "Audit"("submittedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_auditId_idx" ON "AuditEvent"("auditId");

-- CreateIndex
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AuditFieldValue_auditId_idx" ON "AuditFieldValue"("auditId");

-- CreateIndex
CREATE INDEX "AuditScore_auditId_idx" ON "AuditScore"("auditId");

-- CreateIndex
CREATE INDEX "AuditUserView_userId_idx" ON "AuditUserView"("userId");

-- CreateIndex
CREATE INDEX "MonitoringForm_campaignId_idx" ON "MonitoringForm"("campaignId");

-- CreateIndex
CREATE INDEX "MonitoringForm_isArchived_idx" ON "MonitoringForm"("isArchived");

-- CreateIndex
CREATE INDEX "MonitoringFormVersion_formId_idx" ON "MonitoringFormVersion"("formId");

-- CreateIndex
CREATE INDEX "MonitoringFormVersion_isActive_idx" ON "MonitoringFormVersion"("isActive");
