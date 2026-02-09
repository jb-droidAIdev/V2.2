export declare enum CalibrationSessionStatus {
    SCHEDULED = "SCHEDULED",
    ANCHOR_PENDING = "ANCHOR_PENDING",
    SCORING_OPEN = "SCORING_OPEN",
    SCORING_CLOSED = "SCORING_CLOSED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum CalibrationTicketType {
    REPRODUCIBILITY = "REPRODUCIBILITY",
    REPEATABILITY = "REPEATABILITY",
    ACCURACY = "ACCURACY"
}
export declare enum CalibrationAnchorStatus {
    PENDING_VALIDATION = "PENDING_VALIDATION",
    VALIDATED = "VALIDATED",
    REJECTED = "REJECTED",
    NON_MATCHING = "NON_MATCHING"
}
export declare enum CalibrationParticipantRole {
    RATER = "RATER",
    QA_TL = "QA_TL",
    AM_SDM = "AM_SDM"
}
export declare class CreateCalibrationSessionDto {
    campaignId: string;
    title: string;
    description?: string;
    scheduledAt: string;
    reproducibilityTicketCount?: number;
    repeatabilityTicketCount?: number;
    accuracyTicketCount?: number;
    highScoreMin?: number;
    highScoreMax?: number;
    midScoreMin?: number;
    midScoreMax?: number;
    lowScoreMin?: number;
    lowScoreMax?: number;
    targetRnR?: number;
    targetAccuracy?: number;
    raterUserIds: string[];
    qaTlUserId?: string;
    amSdmUserId?: string;
}
export declare class UpdateCalibrationSessionDto {
    title?: string;
    description?: string;
    scheduledAt?: string;
    status?: CalibrationSessionStatus;
}
export declare class RandomizeTicketsDto {
    sessionId: string;
}
export declare class RandomizeReproducibilityDto {
    sessionId: string;
    ticketCount: number;
}
export declare class RandomizeRepeatabilityDto {
    sessionId: string;
    ticketCount: number;
}
export declare class RandomizeAccuracyDto {
    sessionId: string;
    highCount: number;
    midCount: number;
    lowCount: number;
}
export declare class ValidateAnchorDto {
    anchorId: string;
    approved: boolean;
    rejectionReason?: string;
}
export declare class SubmitCalibrationScoreDto {
    sessionId: string;
    ticketId: string;
    totalScore: number;
    scoreDetails?: any;
}
export declare class BulkSubmitScoresDto {
    sessionId: string;
    scores: SubmitCalibrationScoreDto[];
}
export declare class CalculateResultsDto {
    sessionId: string;
}
export declare class GetSessionsQueryDto {
    campaignId?: string;
    status?: CalibrationSessionStatus;
    page?: number;
    limit?: number;
}
export declare class GetMyCalibrationTasksDto {
    status?: CalibrationSessionStatus;
}
