import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TicketUploadBatch, UploadedTicket, CampaignQA } from '@prisma/client';

@Injectable()
export class SamplingService {
    private readonly logger = new Logger(SamplingService.name);

    constructor(private prisma: PrismaService) { }

    async runSampling(batchId: string, campaignId: string) {
        this.logger.log(`Starting sampling for batch ${batchId}`);

        // 1. Fetch Campaign Config
        const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign) throw new Error('Campaign not found');

        const samplingRate = campaign.samplingRate / 100; // e.g. 5.0 -> 0.05

        // 2. Fetch Tickets in Batch
        const tickets = await this.prisma.uploadedTicket.findMany({
            where: { batchId },
        });

        if (tickets.length === 0) {
            this.logger.warn(`No tickets found in batch ${batchId}`);
            return;
        }

        // 3. Group by Agent and Date (Simple approach)
        // We want 5% per agent per day logic usually.
        // For simplicity validation:
        const pools = this.groupTickets(tickets);

        const sampledTicketsToCreate: { ticketId: string; runId: string; assignedQaId: string }[] = [];

        // Create a Sampling Run record
        const run = await this.prisma.samplingRun.create({
            data: {
                batchId,
                campaignId,
                configUsed: { samplingRate, stratification: campaign.stratification ?? {} },
            },
        });

        // 4. Fetch Active QAs
        const qas = await this.prisma.campaignQA.findMany({
            where: { campaignId, isActive: true },
        });

        if (qas.length === 0) {
            this.logger.warn('No active QAs found for campaign. Sampling will leave assignments empty.');
        }

        let qaIndex = 0;

        // 5. Sample & Assign
        for (const poolKey in pools) {
            const pool = pools[poolKey];
            // Target count
            const targetCount = Math.ceil(pool.length * samplingRate);

            // Shuffle
            const shuffled = this.shuffle(pool);
            const selected = shuffled.slice(0, targetCount);

            for (const ticket of selected) {
                let assignedQaId = null;
                if (qas.length > 0) {
                    assignedQaId = qas[qaIndex].userId;
                    qaIndex = (qaIndex + 1) % qas.length; // Round robin
                }

                sampledTicketsToCreate.push({
                    ticketId: ticket.id,
                    runId: run.id,
                    assignedQaId: assignedQaId || '', // Handle null if strictly string
                });
            }
        }

        // 6. Persist
        // Create SampledTicket records
        // Note: assignedQaId in schema is String?, checking logic.
        // Schema: assignedQaId String?

        // Use transaction or createMany
        // createMany is supported
        await this.prisma.sampledTicket.createMany({
            data: sampledTicketsToCreate.map(s => ({
                ticketId: s.ticketId,
                runId: s.runId,
                assignedQaId: s.assignedQaId || null,
                status: 'READY'
            })),
        });

        this.logger.log(`Sampling complete. Selected ${sampledTicketsToCreate.length} tickets from ${tickets.length}.`);

        return { runId: run.id, sampledCount: sampledTicketsToCreate.length };
    }

    private groupTickets(tickets: UploadedTicket[]) {
        // Group by AgentID + Date (YYYY-MM-DD)
        const groups: Record<string, UploadedTicket[]> = {};

        for (const t of tickets) {
            const dateStr = t.interactionDate.toISOString().split('T')[0];
            const key = `${t.agentId}_${dateStr}`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        }

        return groups;
    }

    private shuffle<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
