import { Module } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { PrismaService } from '../../prisma.service';

@Module({
    providers: [SamplingService],
    exports: [SamplingService],
})
export class SamplingModule { }
