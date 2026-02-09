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
var TicketIngestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketIngestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const csv_parse_1 = require("csv-parse");
let TicketIngestService = TicketIngestService_1 = class TicketIngestService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TicketIngestService_1.name);
    }
    async ingestCsv(campaignId, userId, filename, csvContent) {
        this.logger.log(`Ingesting tickets for campaign ${campaignId} from ${filename}`);
        const batch = await this.prisma.ticketUploadBatch.create({
            data: {
                campaignId,
                uploadedBy: userId,
                filename,
            }
        });
        const tickets = [];
        return new Promise((resolve, reject) => {
            (0, csv_parse_1.parse)(csvContent, { columns: true, skip_empty_lines: true }, async (err, records) => {
                if (err)
                    return reject(err);
                try {
                    for (const record of records) {
                        tickets.push({
                            batchId: batch.id,
                            campaignId,
                            externalTicketId: String(record.externalTicketId),
                            agentId: String(record.agentId),
                            interactionDate: new Date(record.interactionDate),
                            channel: record.channel || 'Voice',
                            metadata: record
                        });
                    }
                    if (tickets.length > 0) {
                        const chunkSize = 5000;
                        for (let i = 0; i < tickets.length; i += chunkSize) {
                            const chunk = tickets.slice(i, i + chunkSize);
                            await this.prisma.uploadedTicket.createMany({
                                data: chunk,
                                skipDuplicates: true
                            });
                        }
                    }
                    await this.prisma.ticketUploadBatch.update({
                        where: { id: batch.id },
                        data: { isProcessed: true }
                    });
                    resolve({ batchId: batch.id, count: tickets.length });
                }
                catch (innerErr) {
                    reject(innerErr);
                }
            });
        });
    }
};
exports.TicketIngestService = TicketIngestService;
exports.TicketIngestService = TicketIngestService = TicketIngestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicketIngestService);
//# sourceMappingURL=ticket-ingest.service.js.map