import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established.');
    } catch (error) {
      this.logger.error(
        `⚠️  Could not connect to the database on startup: ${error.message}. The server will still start, but DB operations will fail until the connection is restored.`,
      );
      // Do NOT rethrow — allow the application to start anyway.
      // Prisma will attempt to reconnect on the next query.
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
