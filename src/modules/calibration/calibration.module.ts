import { Module } from '@nestjs/common';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { PrismaService } from '../../prisma.service';

@Module({
    controllers: [CalibrationController],
    providers: [CalibrationService, PrismaService],
})
export class CalibrationModule { }
