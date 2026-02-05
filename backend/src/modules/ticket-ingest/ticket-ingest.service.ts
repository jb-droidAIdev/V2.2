import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { parse } from 'csv-parse';

@Injectable()
export class TicketIngestService {
    private readonly logger = new Logger(TicketIngestService.name);

    constructor(private prisma: PrismaService) { }

    async ingestCsv(campaignId: string, userId: string, filename: string, csvContent: string) {
        this.logger.log(`Ingesting tickets for campaign ${campaignId} from ${filename}`);

        const batch = await this.prisma.ticketUploadBatch.create({
            data: {
                campaignId,
                uploadedBy: userId,
                filename,
            }
        });

        const tickets: any[] = [];

        return new Promise((resolve, reject) => {
            parse(csvContent, { columns: true, skip_empty_lines: true }, async (err, records: any[]) => {
                if (err) return reject(err);

                try {
                    for (const record of records) {
                        // Expected columns: externalTicketId, agentId, interactionDate, channel
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
                        // Chunk inserts to avoid DB parameter limits
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
                } catch (innerErr) {
                    reject(innerErr);
                }
            });
        });
    }
}
