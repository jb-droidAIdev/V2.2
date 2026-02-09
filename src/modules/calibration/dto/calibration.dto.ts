import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, IsArray, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum CalibrationSessionStatus {
    SCHEDULED = 'SCHEDULED',
    ANCHOR_PENDING = 'ANCHOR_PENDING',
    SCORING_OPEN = 'SCORING_OPEN',
    SCORING_CLOSED = 'SCORING_CLOSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum CalibrationTicketType {
    REPRODUCIBILITY = 'REPRODUCIBILITY',
    REPEATABILITY = 'REPEATABILITY',
    ACCURACY = 'ACCURACY',
}

export enum CalibrationAnchorStatus {
    PENDING_VALIDATION = 'PENDING_VALIDATION',
    VALIDATED = 'VALIDATED',
    REJECTED = 'REJECTED',
    NON_MATCHING = 'NON_MATCHING',
}

export enum CalibrationParticipantRole {
    RATER = 'RATER',
    QA_TL = 'QA_TL',
    AM_SDM = 'AM_SDM',
}

// ============================================
// SESSION MANAGEMENT DTOs
// ============================================

export class CreateCalibrationSessionDto {
    @IsString()
    campaignId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    scheduledAt: string;

    // Configurable parameters
    @IsOptional()
    @IsNumber()
    @Min(1)
    reproducibilityTicketCount?: number = 4;

    @IsOptional()
    @IsNumber()
    @Min(1)
    repeatabilityTicketCount?: number = 2;

    @IsOptional()
    @IsNumber()
    @Min(1)
    accuracyTicketCount?: number = 6;

    // Score range configuration
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    highScoreMin?: number = 95;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    highScoreMax?: number = 100;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    midScoreMin?: number = 88;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    midScoreMax?: number = 94;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    lowScoreMin?: number = 0;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    lowScoreMax?: number = 87;

    // Target thresholds
    @IsOptional()
    @IsNumber()
    @Min(0)
    targetRnR?: number = 15.0;

    @IsOptional()
    @IsNumber()
    @Min(0)
    targetAccuracy?: number = 5.0;

    // Participants
    @IsArray()
    @IsString({ each: true })
    raterUserIds: string[];

    @IsOptional()
    @IsString()
    qaTlUserId?: string;

    @IsOptional()
    @IsString()
    amSdmUserId?: string;
}

export class UpdateCalibrationSessionDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @IsOptional()
    @IsEnum(CalibrationSessionStatus)
    status?: CalibrationSessionStatus;
}

// ============================================
// RANDOMIZATION DTOs
// ============================================

export class RandomizeTicketsDto {
    @IsString()
    sessionId: string;
}

export class RandomizeReproducibilityDto {
    @IsString()
    sessionId: string;

    @IsNumber()
    @Min(1)
    ticketCount: number;
}

export class RandomizeRepeatabilityDto {
    @IsString()
    sessionId: string;

    @IsNumber()
    @Min(1)
    ticketCount: number;
}

export class RandomizeAccuracyDto {
    @IsString()
    sessionId: string;

    @IsNumber()
    @Min(1)
    highCount: number = 2;

    @IsNumber()
    @Min(1)
    midCount: number = 2;

    @IsNumber()
    @Min(1)
    lowCount: number = 2;
}

// ============================================
// ANCHOR VALIDATION DTOs
// ============================================

export class ValidateAnchorDto {
    @IsString()
    anchorId: string;

    @IsBoolean()
    approved: boolean;

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}

// ============================================
// SCORING DTOs
// ============================================

export class SubmitCalibrationScoreDto {
    @IsString()
    sessionId: string;

    @IsString()
    ticketId: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    totalScore: number;

    @IsOptional()
    scoreDetails?: any; // JSON object with criterion breakdown
}

export class BulkSubmitScoresDto {
    @IsString()
    sessionId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SubmitCalibrationScoreDto)
    scores: SubmitCalibrationScoreDto[];
}

// ============================================
// CALCULATION DTOs
// ============================================

export class CalculateResultsDto {
    @IsString()
    sessionId: string;
}

// ============================================
// QUERY DTOs
// ============================================

export class GetSessionsQueryDto {
    @IsOptional()
    @IsString()
    campaignId?: string;

    @IsOptional()
    @IsEnum(CalibrationSessionStatus)
    status?: CalibrationSessionStatus;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number = 20;
}

export class GetMyCalibrationTasksDto {
    @IsOptional()
    @IsEnum(CalibrationSessionStatus)
    status?: CalibrationSessionStatus;
}
