import { CalibrationService } from './calibration.service';
import { CreateCalibrationSessionDto, UpdateCalibrationSessionDto, ValidateAnchorDto, SubmitCalibrationScoreDto, GetSessionsQueryDto, GetMyCalibrationTasksDto } from './dto/calibration.dto';
export declare class CalibrationController {
    private readonly calibrationService;
    constructor(calibrationService: CalibrationService);
    createSession(dto: CreateCalibrationSessionDto, req: any): Promise<{
        campaign: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            samplingRate: number;
            stratification: import("@prisma/client/runtime/library").JsonValue | null;
            type: import(".prisma/client").$Enums.CampaignType;
        };
        _count: {
            scores: number;
            tickets: number;
            participants: number;
        };
        participants: ({
            user: {
                name: string;
                id: string;
                email: string;
                role: import(".prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            role: string;
            createdAt: Date;
            userId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
            sessionId: string;
        })[];
        createdBy: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        description: string | null;
        status: import(".prisma/client").$Enums.CalibrationSessionStatus;
        title: string;
        scheduledAt: Date;
        accuracyTicketCount: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        highScoreMax: number;
        highScoreMin: number;
        lowScoreMax: number;
        lowScoreMin: number;
        midScoreMax: number;
        midScoreMin: number;
        repeatabilityTicketCount: number;
        reproducibilityTicketCount: number;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        targetAccuracy: number;
        targetRnR: number;
        totalRange: number | null;
        createdById: string;
    }>;
    getSessions(query: GetSessionsQueryDto): Promise<{
        data: ({
            campaign: {
                name: string;
                id: string;
            };
            _count: {
                scores: number;
                tickets: number;
                participants: number;
            };
            createdBy: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            campaignId: string;
            description: string | null;
            status: import(".prisma/client").$Enums.CalibrationSessionStatus;
            title: string;
            scheduledAt: Date;
            accuracyTicketCount: number;
            avgAccuracyGap: number | null;
            avgRepeatability: number | null;
            avgReproducibility: number | null;
            calculatedRnR: number | null;
            highScoreMax: number;
            highScoreMin: number;
            lowScoreMax: number;
            lowScoreMin: number;
            midScoreMax: number;
            midScoreMin: number;
            repeatabilityTicketCount: number;
            reproducibilityTicketCount: number;
            resultsPublishedAt: Date | null;
            scoringClosedAt: Date | null;
            scoringOpenedAt: Date | null;
            targetAccuracy: number;
            targetRnR: number;
            totalRange: number | null;
            createdById: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSessionById(id: string): Promise<{
        campaign: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            samplingRate: number;
            stratification: import("@prisma/client/runtime/library").JsonValue | null;
            type: import(".prisma/client").$Enums.CampaignType;
        };
        _count: {
            scores: number;
            tickets: number;
            participants: number;
        };
        tickets: ({
            audit: {
                id: string;
                score: number;
                agent: {
                    name: string;
                };
            };
            scores: ({
                participant: {
                    user: {
                        name: string;
                        id: string;
                    };
                } & {
                    id: string;
                    role: string;
                    createdAt: Date;
                    userId: string;
                    completedAt: Date | null;
                    hasCompletedScoring: boolean;
                    sessionId: string;
                };
            } & {
                id: string;
                ticketId: string;
                sessionId: string;
                participantId: string;
                scoreDetails: import("@prisma/client/runtime/library").JsonValue | null;
                scoredAt: Date;
                totalScore: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CalibrationTicketType;
            auditId: string | null;
            channel: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ticketId: string;
            sessionId: string;
            scoreRange: string | null;
            passNumber: number | null;
            groupId: string | null;
            anchorScore: number | null;
            agentName: string | null;
        })[];
        anchors: ({
            audit: {
                id: string;
                score: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.CalibrationAnchorStatus;
            score: number;
            auditId: string;
            sessionId: string;
            scoreRange: string;
            qaTlApproved: boolean | null;
            qaTlApprovedBy: string | null;
            qaTlApprovedAt: Date | null;
            amSdmApproved: boolean | null;
            amSdmApprovedBy: string | null;
            amSdmApprovedAt: Date | null;
            rejectionReason: string | null;
        })[];
        participants: ({
            user: {
                name: string;
                id: string;
                email: string;
                role: import(".prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            role: string;
            createdAt: Date;
            userId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
            sessionId: string;
        })[];
        results: ({
            user: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            userId: string | null;
            avgAccuracyGap: number | null;
            avgRepeatability: number | null;
            avgReproducibility: number | null;
            calculatedRnR: number | null;
            totalRange: number | null;
            sessionId: string;
            accuracyByRange: import("@prisma/client/runtime/library").JsonValue | null;
            passedRnR: boolean | null;
            passedAccuracy: boolean | null;
            calculatedAt: Date;
        })[];
        createdBy: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        description: string | null;
        status: import(".prisma/client").$Enums.CalibrationSessionStatus;
        title: string;
        scheduledAt: Date;
        accuracyTicketCount: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        highScoreMax: number;
        highScoreMin: number;
        lowScoreMax: number;
        lowScoreMin: number;
        midScoreMax: number;
        midScoreMin: number;
        repeatabilityTicketCount: number;
        reproducibilityTicketCount: number;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        targetAccuracy: number;
        targetRnR: number;
        totalRange: number | null;
        createdById: string;
    }>;
    updateSession(id: string, dto: UpdateCalibrationSessionDto): Promise<{
        campaign: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            samplingRate: number;
            stratification: import("@prisma/client/runtime/library").JsonValue | null;
            type: import(".prisma/client").$Enums.CampaignType;
        };
        participants: ({
            user: {
                name: string;
                id: string;
                email: string;
            };
        } & {
            id: string;
            role: string;
            createdAt: Date;
            userId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
            sessionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        description: string | null;
        status: import(".prisma/client").$Enums.CalibrationSessionStatus;
        title: string;
        scheduledAt: Date;
        accuracyTicketCount: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        highScoreMax: number;
        highScoreMin: number;
        lowScoreMax: number;
        lowScoreMin: number;
        midScoreMax: number;
        midScoreMin: number;
        repeatabilityTicketCount: number;
        reproducibilityTicketCount: number;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        targetAccuracy: number;
        targetRnR: number;
        totalRange: number | null;
        createdById: string;
    }>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
    randomizeTickets(id: string): Promise<{
        message: string;
    }>;
    validateAnchor(anchorId: string, dto: ValidateAnchorDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.CalibrationAnchorStatus;
        score: number;
        auditId: string;
        sessionId: string;
        scoreRange: string;
        qaTlApproved: boolean | null;
        qaTlApprovedBy: string | null;
        qaTlApprovedAt: Date | null;
        amSdmApproved: boolean | null;
        amSdmApprovedBy: string | null;
        amSdmApprovedAt: Date | null;
        rejectionReason: string | null;
    }>;
    getSessionAnchors(sessionId: string): Promise<any>;
    submitScore(dto: SubmitCalibrationScoreDto, req: any): Promise<{
        id: string;
        ticketId: string;
        sessionId: string;
        participantId: string;
        scoreDetails: import("@prisma/client/runtime/library").JsonValue | null;
        scoredAt: Date;
        totalScore: number;
    }>;
    getSessionTickets(sessionId: string): Promise<any>;
    getSessionScores(sessionId: string): Promise<{
        tickets: any;
        totalScores: any;
    }>;
    calculateResults(sessionId: string): Promise<{
        avgReproducibility: number;
        avgRepeatability: number;
        totalRange: number;
        calculatedRnR: number;
        avgAccuracyGap: number;
        passedRnR: boolean;
        passedAccuracy: boolean;
    }>;
    getSessionResults(sessionId: string): Promise<{
        session: {
            id: any;
            title: any;
            status: any;
            avgReproducibility: any;
            avgRepeatability: any;
            totalRange: any;
            calculatedRnR: any;
            avgAccuracyGap: any;
            targetRnR: any;
            targetAccuracy: any;
        };
        results: any;
    }>;
    getMyCalibrationTasks(query: GetMyCalibrationTasksDto, req: any): Promise<({
        campaign: {
            name: string;
            id: string;
        };
        _count: {
            scores: number;
            tickets: number;
        };
        participants: {
            role: string;
            hasCompletedScoring: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        description: string | null;
        status: import(".prisma/client").$Enums.CalibrationSessionStatus;
        title: string;
        scheduledAt: Date;
        accuracyTicketCount: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        highScoreMax: number;
        highScoreMin: number;
        lowScoreMax: number;
        lowScoreMin: number;
        midScoreMax: number;
        midScoreMin: number;
        repeatabilityTicketCount: number;
        reproducibilityTicketCount: number;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        targetAccuracy: number;
        targetRnR: number;
        totalRange: number | null;
        createdById: string;
    })[]>;
    getMyTaskDetails(sessionId: string, req: any): Promise<{
        error: string;
        session?: undefined;
        participant?: undefined;
        tickets?: undefined;
        progress?: undefined;
    } | {
        session: {
            id: any;
            title: any;
            description: any;
            status: any;
            scheduledAt: any;
        };
        participant: {
            id: any;
            userId: any;
            role: any;
            hasCompletedScoring: any;
            completedAt: any;
        };
        tickets: any;
        progress: {
            total: any;
            completed: any;
            pending: any;
        };
        error?: undefined;
    }>;
    getCampaignCalibrationStats(campaignId: string): Promise<{
        campaignId: string;
        totalSessions: number;
        completedSessions: number;
        avgRnR: number;
        avgAccuracy: number;
        sessions: {
            id: any;
            title: any;
            scheduledAt: any;
            calculatedRnR: any;
            avgAccuracyGap: any;
            passedRnR: boolean;
            passedAccuracy: boolean;
        }[];
    }>;
    getCalibrationOverview(): Promise<{
        total: number;
        byStatus: {
            SCHEDULED: number;
            ANCHOR_PENDING: number;
            SCORING_OPEN: number;
            SCORING_CLOSED: number;
            COMPLETED: number;
            CANCELLED: number;
        };
        recentSessions: ({
            campaign: {
                name: string;
                id: string;
            };
            _count: {
                scores: number;
                tickets: number;
                participants: number;
            };
            createdBy: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            campaignId: string;
            description: string | null;
            status: import(".prisma/client").$Enums.CalibrationSessionStatus;
            title: string;
            scheduledAt: Date;
            accuracyTicketCount: number;
            avgAccuracyGap: number | null;
            avgRepeatability: number | null;
            avgReproducibility: number | null;
            calculatedRnR: number | null;
            highScoreMax: number;
            highScoreMin: number;
            lowScoreMax: number;
            lowScoreMin: number;
            midScoreMax: number;
            midScoreMin: number;
            repeatabilityTicketCount: number;
            reproducibilityTicketCount: number;
            resultsPublishedAt: Date | null;
            scoringClosedAt: Date | null;
            scoringOpenedAt: Date | null;
            targetAccuracy: number;
            targetRnR: number;
            totalRange: number | null;
            createdById: string;
        })[];
    }>;
}
