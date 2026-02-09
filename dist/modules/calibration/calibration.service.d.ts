import { PrismaService } from '../../prisma.service';
import { CreateCalibrationSessionDto, UpdateCalibrationSessionDto, SubmitCalibrationScoreDto, GetSessionsQueryDto, CalibrationSessionStatus } from './dto/calibration.dto';
export declare class CalibrationService {
    private prisma;
    constructor(prisma: PrismaService);
    createSession(dto: CreateCalibrationSessionDto, createdById: string): Promise<{
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
            sessionId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
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
        reproducibilityTicketCount: number;
        repeatabilityTicketCount: number;
        accuracyTicketCount: number;
        highScoreMin: number;
        highScoreMax: number;
        midScoreMin: number;
        midScoreMax: number;
        lowScoreMin: number;
        lowScoreMax: number;
        targetRnR: number;
        targetAccuracy: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
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
            reproducibilityTicketCount: number;
            repeatabilityTicketCount: number;
            accuracyTicketCount: number;
            highScoreMin: number;
            highScoreMax: number;
            midScoreMin: number;
            midScoreMax: number;
            lowScoreMin: number;
            lowScoreMax: number;
            targetRnR: number;
            targetAccuracy: number;
            avgAccuracyGap: number | null;
            avgRepeatability: number | null;
            avgReproducibility: number | null;
            calculatedRnR: number | null;
            resultsPublishedAt: Date | null;
            scoringClosedAt: Date | null;
            scoringOpenedAt: Date | null;
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
                    sessionId: string;
                    completedAt: Date | null;
                    hasCompletedScoring: boolean;
                };
            } & {
                id: string;
                ticketId: string;
                sessionId: string;
                totalScore: number;
                scoreDetails: import("@prisma/client/runtime/library").JsonValue | null;
                participantId: string;
                scoredAt: Date;
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
            sessionId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
        })[];
        results: ({
            user: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            userId: string | null;
            sessionId: string;
            avgAccuracyGap: number | null;
            avgRepeatability: number | null;
            avgReproducibility: number | null;
            calculatedRnR: number | null;
            totalRange: number | null;
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
        reproducibilityTicketCount: number;
        repeatabilityTicketCount: number;
        accuracyTicketCount: number;
        highScoreMin: number;
        highScoreMax: number;
        midScoreMin: number;
        midScoreMax: number;
        lowScoreMin: number;
        lowScoreMax: number;
        targetRnR: number;
        targetAccuracy: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
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
            sessionId: string;
            completedAt: Date | null;
            hasCompletedScoring: boolean;
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
        reproducibilityTicketCount: number;
        repeatabilityTicketCount: number;
        accuracyTicketCount: number;
        highScoreMin: number;
        highScoreMax: number;
        midScoreMin: number;
        midScoreMax: number;
        lowScoreMin: number;
        lowScoreMax: number;
        targetRnR: number;
        targetAccuracy: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        totalRange: number | null;
        createdById: string;
    }>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
    randomizeAllTickets(sessionId: string): Promise<{
        message: string;
    }>;
    private randomizeReproducibility;
    private randomizeRepeatability;
    private randomizeAccuracy;
    validateAnchor(anchorId: string, userId: string, approved: boolean, rejectionReason?: string): Promise<{
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
    private replaceAnchor;
    private checkAndOpenScoring;
    submitScore(dto: SubmitCalibrationScoreDto, userId: string): Promise<{
        id: string;
        ticketId: string;
        sessionId: string;
        totalScore: number;
        scoreDetails: import("@prisma/client/runtime/library").JsonValue | null;
        participantId: string;
        scoredAt: Date;
    }>;
    private checkParticipantCompletion;
    private checkAllParticipantsCompleted;
    calculateResults(sessionId: string): Promise<{
        avgReproducibility: number;
        avgRepeatability: number;
        totalRange: number;
        calculatedRnR: number;
        avgAccuracyGap: number;
        passedRnR: boolean;
        passedAccuracy: boolean;
    }>;
    private calculateReproducibility;
    private calculateRepeatability;
    private calculateTotalRange;
    private calculateAccuracy;
    private calculateIndividualResults;
    private calculateStandardDeviation;
    getMyCalibrationTasks(userId: string, status?: CalibrationSessionStatus): Promise<({
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
        reproducibilityTicketCount: number;
        repeatabilityTicketCount: number;
        accuracyTicketCount: number;
        highScoreMin: number;
        highScoreMax: number;
        midScoreMin: number;
        midScoreMax: number;
        lowScoreMin: number;
        lowScoreMax: number;
        targetRnR: number;
        targetAccuracy: number;
        avgAccuracyGap: number | null;
        avgRepeatability: number | null;
        avgReproducibility: number | null;
        calculatedRnR: number | null;
        resultsPublishedAt: Date | null;
        scoringClosedAt: Date | null;
        scoringOpenedAt: Date | null;
        totalRange: number | null;
        createdById: string;
    })[]>;
    private shuffleArray;
    private generateUUID;
}
