"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SamplingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamplingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SamplingService = SamplingService_1 = class SamplingService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SamplingService_1.name);
    }
    async runSampling(batchId, campaignId) {
        this.logger.log(`Starting sampling for batch ${batchId}`);
        const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign)
            throw new Error('Campaign not found');
        const samplingRate = campaign.samplingRate / 100;
        const tickets = await this.prisma.uploadedTicket.findMany({
            where: { batchId },
        });
        if (tickets.length === 0) {
            this.logger.warn(`No tickets found in batch ${batchId}`);
            return;
        }
        const pools = this.groupTickets(tickets);
        const sampledTicketsToCreate = [];
        const run = await this.prisma.samplingRun.create({
            data: {
                batchId,
                campaignId,
                configUsed: { samplingRate, stratification: campaign.stratification ?? {} },
            },
        });
        const qas = await this.prisma.campaignQA.findMany({
            where: { campaignId, isActive: true },
        });
        if (qas.length === 0) {
            this.logger.warn('No active QAs found for campaign. Sampling will leave assignments empty.');
        }
        let qaIndex = 0;
        for (const poolKey in pools) {
            const pool = pools[poolKey];
            const targetCount = Math.ceil(pool.length * samplingRate);
            const shuffled = this.shuffle(pool);
            const selected = shuffled.slice(0, targetCount);
            for (const ticket of selected) {
                let assignedQaId = null;
                if (qas.length > 0) {
                    assignedQaId = qas[qaIndex].userId;
                    qaIndex = (qaIndex + 1) % qas.length;
                }
                sampledTicketsToCreate.push({
                    ticketId: ticket.id,
                    runId: run.id,
                    assignedQaId: assignedQaId || '',
                });
            }
        }
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
    groupTickets(tickets) {
        const groups = {};
        for (const t of tickets) {
            const dateStr = t.interactionDate.toISOString().split('T')[0];
            const key = `${t.agentId}_${dateStr}`;
            if (!groups[key])
                groups[key] = [];
            groups[key].push(t);
        }
        return groups;
    }
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
};
exports.SamplingService = SamplingService;
exports.SamplingService = SamplingService = SamplingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SamplingService);
//# sourceMappingURL=sampling.service.js.map