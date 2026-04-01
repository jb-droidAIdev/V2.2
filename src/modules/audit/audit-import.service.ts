import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, CampaignType } from '@prisma/client';

@Injectable()
export class AuditImportService {
  constructor(private prisma: PrismaService) {}

  async importLegacyAudits(data: any[]) {
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 1. Group records by unique audit key to handle multiple failures per audit
    const groups = new Map<string, any[]>();
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const agentEid = String(row['Agent EID'] || '').trim();
        const campaignName = String(row['Campaign'] || '').trim();
        const transactionID = String(row['Transaction ID'] || row['Reference'] || row['Internal ID'] || '').trim();
        const dateStr = String(row['Date of Transaction'] || row['Date'] || '').trim();
        
        // Create unique key for the audit (Agent + Campaign + Transaction + Date)
        const key = `${agentEid}|${campaignName}|${transactionID}|${dateStr}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ ...row, _originalRow: i + 2 });
    }

    // 2. Process each grouped audit
    for (const [key, groupRows] of groups.entries()) {
      try {
        const firstRow = groupRows[0];
        const agentEid = String(firstRow['Agent EID'] || '').trim();
        const campaignName = String(firstRow['Campaign'] || '').trim();
        const scoreStr = String(firstRow['Score (%)'] ?? firstRow['Score'] ?? '100').replace('%', '');
        const score = parseFloat(scoreStr);
        const transactionID = String(firstRow['Transaction ID'] || firstRow['Reference'] || firstRow['Internal ID'] || '').trim();
        const transactionDateStr = firstRow['Date of Transaction'] || firstRow['Date'];
        const auditDateStr = firstRow['Date of Audit'] || transactionDateStr;
        const aht = String(firstRow['AHT (hh:mm:ss)'] || '00:00:00').trim();
        const disposition = String(firstRow['Disposition'] || '').trim();
        const autoFailRaw = String(firstRow['Auto Fail'] || firstRow['AutoFail'] || 'No').trim().toLowerCase();
        const isAutoFailed = ['yes', 'true', '1'].includes(autoFailRaw);

        if (!agentEid || !campaignName || isNaN(score) || !transactionDateStr) {
          throw new Error('Missing core fields: Agent EID, Campaign, Score (%), or Date of Transaction');
        }

        // Resolve Entities
        const agent = await this.prisma.user.findFirst({
          where: { OR: [{ eid: agentEid }, { email: agentEid }] }
        });
        if (!agent) throw new Error(`Agent not found with EID: ${agentEid}`);

        let campaign = await this.prisma.campaign.findFirst({
          where: { name: { equals: campaignName, mode: 'insensitive' } }
        });
        if (!campaign) throw new Error(`Campaign not found: ${campaignName}`);

        let form = await this.prisma.monitoringForm.findFirst({
          where: { campaignId: campaign.id, isArchived: false },
          include: { versions: { where: { isActive: true }, take: 1 } }
        });

        // Fallback: search by teamName if direct campaignId link doesn't exist
        if (!form || !form.versions[0]) {
            form = await this.prisma.monitoringForm.findFirst({
                where: { teamName: { equals: campaign.name, mode: 'insensitive' }, isArchived: false },
                include: { versions: { where: { isActive: true }, take: 1 } }
            });
        }

        if (!form || !form.versions[0]) throw new Error(`No active scorecard found for campaign or team: ${campaignName}`);

        const parseDate = (val: any) => {
            if (typeof val === 'number' && val > 20000 && val < 100000) {
                // Handle Excel serial date
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            return new Date(val);
        };
        
        const transDate = parseDate(transactionDateStr);
        const auditDate = parseDate(auditDateStr);
        if (isNaN(transDate.getTime())) throw new Error(`Invalid transaction date: ${transactionDateStr}`);

        // Collect all unique failed params and their categories across the group
        const failures: { title: string, category: string }[] = [];
        groupRows.forEach(row => {
            const rowCategory = String(row['Form Category'] || row['Form Category (Optional)'] || 'Legacy Parameter').trim();
            const rowFailedParams = String(row['Critical Parameters Failed'] || row['Critical Parameters Failed (Optional)'] || '')
                .split(',').map(s => s.trim()).filter(Boolean);
            
            rowFailedParams.forEach(p => failures.push({ title: p, category: rowCategory }));
        });

        // Create the single Audit record
        const audit = await this.prisma.audit.create({
          data: {
            campaignId: campaign.id,
            agentId: agent.id,
            auditorId: agent.id, 
            formVersionId: form.versions[0].id,
            score: score,
            status: AuditStatus.RELEASED,
            isLegacy: true,
            ticketReference: transactionID || `LEGACY-${Math.random().toString(36).substr(2, 6)}`,
            startedAt: transDate,
            submittedAt: auditDate,
            releasedAt: auditDate,
            lastActionAt: auditDate,
            isAutoFailed: isAutoFailed,
            legacyMetadata: {
                mergedRows: groupRows.map(r => r._originalRow),
                importTimestamp: new Date().toISOString(),
                supervisor: firstRow["Agent's Supervisor"],
                auditorName: firstRow['Auditor'],
                duration: firstRow['Audit Duration'],
                projectCode: firstRow['Project Code'],
                type: firstRow['Type'] || 'LEGACY IMPORT'
            }
          }
        });

        // 5. Create field values
        if (aht) await this.prisma.auditFieldValue.create({ data: { auditId: audit.id, fieldName: 'AHT', value: aht } });
        if (disposition) await this.prisma.auditFieldValue.create({ data: { auditId: audit.id, fieldName: 'Disposition', value: disposition } });

        // Also persist transactionType and interactionDate so the Audits table + Preview modal read them correctly
        const transactionType = String(firstRow['Type'] || '').trim();
        if (transactionType && transactionType.toUpperCase() !== 'N/A') {
            await this.prisma.auditFieldValue.create({ data: { auditId: audit.id, fieldName: 'transactionType', value: transactionType } });
        }
        const transactionDateFormatted = transDate.toISOString().split('T')[0];
        await this.prisma.auditFieldValue.create({ data: { auditId: audit.id, fieldName: 'interactionDate', value: transactionDateFormatted } });

        // 6. Create failed parameter scores from all merged rows
        // Note: For legacy imports we need a UNIQUE valid ID per failure to satisfy the DB constraint.
        // We will fetch all available criteria and assign failures to them 1-by-1.
        const availableCriteria = await this.prisma.formCriterion.findMany({
            where: { formVersionId: form.versions[0].id },
            orderBy: { orderIndex: 'asc' }
        });

        if (availableCriteria.length === 0 && failures.length > 0) {
            throw new Error(`The target scorecard "${form.name}" has no criteria configured. Please finalize the form before importing historical errors.`);
        }

        for (let j = 0; j < failures.length; j++) {
            const fail = failures[j];
            // Cycle through criteria or append to the last one if we run out
            const criterionIndex = Math.min(j, availableCriteria.length - 1);
            const targetCriterion = availableCriteria[criterionIndex];

            // If we are reusing the last criterion (out of range), we append the title to avoid losing data
            // but we still face a unique constraint on (auditId, criterionId) if we create a NEW record.
            // So we must handle the "more failures than criteria" case by UPSERTING.
            
            await this.prisma.auditScore.upsert({
                where: {
                    auditId_criterionId: {
                        auditId: audit.id,
                        criterionId: targetCriterion.id
                    }
                },
                update: {
                    // Append title if already exists
                    criterionTitle: { set: `Multiple: ${fail.title}` },
                    categoryLabel: { set: fail.category }
                },
                create: {
                    auditId: audit.id,
                    criterionId: targetCriterion.id,
                    criterionTitle: fail.title,
                    categoryLabel: fail.category,
                    score: 0,
                    isFailed: true,
                    comment: 'Imported historical failure'
                }
            });
        }

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Group ${key}: ${err.message}`);
      }
    }

    return results;
  }
}
