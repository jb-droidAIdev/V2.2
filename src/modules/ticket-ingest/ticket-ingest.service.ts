import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

@Injectable()
export class TicketIngestService {
  private readonly logger = new Logger(TicketIngestService.name);

  async ingestCsv(
    campaignId: string,
    userId: string,
    filename: string,
    csvContent: string,
  ) {
    this.logger.log(
      `Ingesting tickets for campaign ${campaignId} from ${filename}`,
    );

    const batch = await this.prisma.ticketUploadBatch.create({
      data: {
        campaignId,
        uploadedBy: userId,
        filename,
      },
    });

    const CHUNK_SIZE = 1000;
    let totalInserted = 0;
    let buffer: any[] = [];

    return new Promise<{ batchId: string; count: number }>((resolve, reject) => {
      const parser = Readable.from(csvContent).pipe(
        parse({ columns: true, skip_empty_lines: true }),
      );

      const flushBuffer = async () => {
        if (buffer.length === 0) return;
        const chunk = buffer.splice(0, buffer.length);
        await this.prisma.uploadedTicket.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        totalInserted += chunk.length;
      };

      parser.on('data', async (record: any) => {
        buffer.push({
          batchId: batch.id,
          campaignId,
          externalTicketId: String(record.externalTicketId),
          agentId: String(record.agentId),
          interactionDate: new Date(record.interactionDate),
          channel: record.channel || 'Voice',
          metadata: record,
        });

        // Flush in chunks to keep memory constant
        if (buffer.length >= CHUNK_SIZE) {
          parser.pause();
          try {
            await flushBuffer();
          } catch (err) {
            parser.destroy(err as Error);
            return;
          }
          parser.resume();
        }
      });

      parser.on('end', async () => {
        try {
          // Flush remaining records
          await flushBuffer();

          await this.prisma.ticketUploadBatch.update({
            where: { id: batch.id },
            data: { isProcessed: true },
          });

          this.logger.log(
            `Ingestion complete. Inserted ${totalInserted} tickets from ${filename}.`,
          );
          resolve({ batchId: batch.id, count: totalInserted });
        } catch (err) {
          reject(err);
        }
      });

      parser.on('error', (err) => {
        this.logger.error(`CSV parse error: ${err.message}`);
        reject(err);
      });
    });
  }

  constructor(private prisma: PrismaService) {}
}
