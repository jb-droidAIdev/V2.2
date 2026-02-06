import { Module } from '@nestjs/common';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { PrismaService } from '../../prisma.service';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [CalibrationController],
    providers: [CalibrationService, PrismaService],
    exports: [CalibrationService],
})
export class CalibrationModule { }
