import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
    CreateCalibrationSessionDto,
    UpdateCalibrationSessionDto,
    RandomizeTicketsDto,
    ValidateAnchorDto,
    SubmitCalibrationScoreDto,
    CalculateResultsDto,
    GetSessionsQueryDto,
    CalibrationSessionStatus,
    CalibrationTicketType,
    CalibrationAnchorStatus,
    CalibrationParticipantRole,
} from './dto/calibration.dto';
import { CalibrationSessionStatus as PrismaSessionStatus, CalibrationTicketType as PrismaTicketType, CalibrationAnchorStatus as PrismaAnchorStatus, AuditStatus as PrismaAuditStatus, CalibrationTicket, CalibrationAnchor } from '@prisma/client';

@Injectable()
export class CalibrationService {
    constructor(private prisma: PrismaService) { }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    async createSession(dto: CreateCalibrationSessionDto, createdById: string) {
        // Create session with participants
        const session = await this.prisma.calibrationSession.create({
            data: {
                campaignId: dto.campaignId,
                title: dto.title,
                description: dto.description,
                scheduledAt: new Date(dto.scheduledAt),
                status: PrismaSessionStatus.SCHEDULED,
                reproducibilityTicketCount: dto.reproducibilityTicketCount || 4,
                repeatabilityTicketCount: dto.repeatabilityTicketCount || 2,
                accuracyTicketCount: dto.accuracyTicketCount || 6,
                highScoreMin: dto.highScoreMin || 95,
                highScoreMax: dto.highScoreMax || 100,
                midScoreMin: dto.midScoreMin || 88,
                midScoreMax: dto.midScoreMax || 94,
                lowScoreMin: dto.lowScoreMin || 0,
                lowScoreMax: dto.lowScoreMax || 87,
                targetRnR: dto.targetRnR || 15.0,
                targetAccuracy: dto.targetAccuracy || 5.0,
                createdById,
                participants: {
                    create: [
                        // Add raters
                        ...dto.raterUserIds.map(userId => ({
                            userId,
                            role: CalibrationParticipantRole.RATER,
                        })),
                        // Add QA TL if provided
                        ...(dto.qaTlUserId ? [{
                            userId: dto.qaTlUserId,
                            role: CalibrationParticipantRole.QA_TL,
                        }] : []),
                        // Add AM/SDM if provided
                        ...(dto.amSdmUserId ? [{
                            userId: dto.amSdmUserId,
                            role: CalibrationParticipantRole.AM_SDM,
                        }] : []),
                    ],
                },
            },
            include: {
                campaign: true,
                createdBy: { select: { id: true, name: true, email: true } },
                participants: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                _count: {
                    select: {
                        participants: true,
                        tickets: true,
                        scores: true,
                    },
                },
            },
        });

        // TODO: Send notifications to participants

        return session;
    }

    async getSessions(query: GetSessionsQueryDto) {
        const where: any = {};

        if (query.campaignId) {
            where.campaignId = query.campaignId;
        }

        if (query.status) {
            where.status = query.status as PrismaSessionStatus;
        }

        const [sessions, total] = await Promise.all([
            this.prisma.calibrationSession.findMany({
                where,
                include: {
                    campaign: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                    _count: {
                        select: {
                            participants: true,
                            tickets: true,
                            scores: true,
                        },
                    },
                },
                orderBy: { scheduledAt: 'desc' },
                skip: ((query.page || 1) - 1) * (query.limit || 20),
                take: query.limit || 20,
            }),
            this.prisma.calibrationSession.count({ where }),
        ]);

        return {
            data: sessions,
            total,
            page: query.page || 1,
            limit: query.limit || 20,
            totalPages: Math.ceil(total / (query.limit || 20)),
        };
    }

    async getSessionById(id: string) {
        const session = await this.prisma.calibrationSession.findUnique({
            where: { id },
            include: {
                campaign: true,
                createdBy: { select: { id: true, name: true, email: true } },
                participants: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                tickets: {
                    include: {
                        audit: {
                            select: {
                                id: true,
                                score: true,
                                agent: { select: { name: true } },
                            },
                        },
                        scores: {
                            include: {
                                participant: {
                                    include: {
                                        user: { select: { id: true, name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                anchors: {
                    include: {
                        audit: {
                            select: {
                                id: true,
                                score: true,
                            },
                        },
                    },
                },
                results: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                },
                _count: {
                    select: {
                        participants: true,
                        tickets: true,
                        scores: true,
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Calibration session not found');
        }

        return session;
    }

    async updateSession(id: string, dto: UpdateCalibrationSessionDto) {
        const session = await this.prisma.calibrationSession.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
                ...(dto.status && { status: dto.status as PrismaSessionStatus }),
            },
            include: {
                campaign: true,
                participants: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        return session;
    }

    async deleteSession(id: string) {
        await this.prisma.calibrationSession.delete({
            where: { id },
        });

        return { message: 'Session deleted successfully' };
    }

    // ============================================
    // RANDOMIZATION LOGIC
    // ============================================

    async randomizeAllTickets(sessionId: string) {
        const session = await this.getSessionById(sessionId);

        // Step 1: Randomize Reproducibility tickets
        await this.randomizeReproducibility(sessionId, session.reproducibilityTicketCount);

        // Step 2: Randomize Repeatability tickets
        await this.randomizeRepeatability(sessionId, session.repeatabilityTicketCount);

        // Step 3: Randomize Accuracy anchors
        await this.randomizeAccuracy(sessionId);

        // Update session status
        await this.prisma.calibrationSession.update({
            where: { id: sessionId },
            data: { status: PrismaSessionStatus.ANCHOR_PENDING },
        });

        return { message: 'Tickets randomized successfully' };
    }

    private async randomizeReproducibility(sessionId: string, count: number) {
        const session = await this.getSessionById(sessionId);

        // Get recent audits from the campaign (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const audits = await this.prisma.audit.findMany({
            where: {
                campaignId: session.campaignId,
                status: PrismaAuditStatus.RELEASED,
                releasedAt: { gte: thirtyDaysAgo },
                dispute: null, // Not under dispute
            },
            select: {
                id: true,
                sampledTicket: { select: { ticket: { select: { externalTicketId: true, metadata: true } } } },
                ticketReference: true,
                score: true,
                agent: { select: { name: true } },
            },
            take: 100, // Get a pool to randomize from
        });

        if (audits.length < count) {
            throw new BadRequestException(`Not enough audits available for reproducibility. Need ${count}, found ${audits.length}`);
        }

        // Randomly select tickets
        const selectedAudits = this.shuffleArray(audits).slice(0, count);

        // Create calibration tickets
        await this.prisma.calibrationTicket.createMany({
            data: selectedAudits.map((audit: any) => ({
                sessionId,
                auditId: audit.id,
                ticketId: audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'UNKNOWN',
                type: PrismaTicketType.REPRODUCIBILITY,
                agentName: audit.agent.name,
                metadata: audit.sampledTicket?.ticket?.metadata || audit.metadata,
            })),
        });
    }

    private async randomizeRepeatability(sessionId: string, count: number) {
        const session = await this.getSessionById(sessionId);

        // Get recent audits from the campaign
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const audits = await this.prisma.audit.findMany({
            where: {
                campaignId: session.campaignId,
                status: PrismaAuditStatus.RELEASED,
                releasedAt: { gte: thirtyDaysAgo },
                dispute: null,
            },
            select: {
                id: true,
                sampledTicket: { select: { ticket: { select: { externalTicketId: true, metadata: true } } } },
                ticketReference: true,
                score: true,
                agent: { select: { name: true } },
            },
            take: 100,
        });

        if (audits.length < count) {
            throw new BadRequestException(`Not enough audits available for repeatability. Need ${count}, found ${audits.length}`);
        }

        // Randomly select tickets
        const selectedAudits = this.shuffleArray(audits).slice(0, count);

        // Create TWO passes for each ticket (repeatability = scoring same ticket twice)
        const ticketsToCreate: any[] = [];
        for (const audit of selectedAudits) {
            const groupId = this.generateUUID();

            const ticketId = (audit as any).sampledTicket?.ticket?.externalTicketId || (audit as any).ticketReference || 'UNKNOWN';

            // First pass
            ticketsToCreate.push({
                sessionId,
                auditId: audit.id,
                ticketId,
                type: PrismaTicketType.REPEATABILITY,
                passNumber: 1,
                groupId,
                agentName: (audit as any).agent.name,
                metadata: (audit as any).sampledTicket?.ticket?.metadata || (audit as any).metadata,
            });

            // Second pass
            ticketsToCreate.push({
                sessionId,
                auditId: audit.id,
                ticketId,
                type: PrismaTicketType.REPEATABILITY,
                passNumber: 2,
                groupId,
                agentName: (audit as any).agent.name,
                metadata: (audit as any).sampledTicket?.ticket?.metadata || (audit as any).metadata,
            });
        }

        await this.prisma.calibrationTicket.createMany({
            data: ticketsToCreate,
        });
    }

    private async randomizeAccuracy(sessionId: string) {
        const session = await this.getSessionById(sessionId);

        // Get audits in each score range
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const baseWhere = {
            campaignId: session.campaignId,
            status: PrismaAuditStatus.RELEASED,
            releasedAt: { gte: thirtyDaysAgo },
            dispute: null,
        };

        // Get HIGH score audits (95-100)
        const highScoreAudits = await this.prisma.audit.findMany({
            where: {
                ...baseWhere,
                score: {
                    gte: session.highScoreMin,
                    lte: session.highScoreMax,
                },
            },
            select: {
                id: true,
                score: true,
            },
            take: 10,
        });

        // Get MID score audits (88-94)
        const midScoreAudits = await this.prisma.audit.findMany({
            where: {
                ...baseWhere,
                score: {
                    gte: session.midScoreMin,
                    lte: session.midScoreMax,
                },
            },
            select: {
                id: true,
                score: true,
            },
            take: 10,
        });

        // Get LOW score audits (0-87)
        const lowScoreAudits = await this.prisma.audit.findMany({
            where: {
                ...baseWhere,
                score: {
                    gte: session.lowScoreMin,
                    lte: session.lowScoreMax,
                },
            },
            select: {
                id: true,
                score: true,
            },
            take: 10,
        });

        // Select 2 from each range
        const selectedHigh = this.shuffleArray(highScoreAudits).slice(0, 2);
        const selectedMid = this.shuffleArray(midScoreAudits).slice(0, 2);
        const selectedLow = this.shuffleArray(lowScoreAudits).slice(0, 2);

        if (selectedHigh.length < 2 || selectedMid.length < 2 || selectedLow.length < 2) {
            throw new BadRequestException('Not enough audits in each score range for accuracy calibration');
        }

        // Create anchor tickets (pending validation)
        const anchorsToCreate = [
            ...selectedHigh.map((audit: any) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'HIGH',
                score: audit.score || 0,
                status: PrismaAnchorStatus.PENDING_VALIDATION,
            })),
            ...selectedMid.map((audit: any) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'MID',
                score: audit.score || 0,
                status: PrismaAnchorStatus.PENDING_VALIDATION,
            })),
            ...selectedLow.map((audit: any) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'LOW',
                score: audit.score || 0,
                status: PrismaAnchorStatus.PENDING_VALIDATION,
            })),
        ];

        await this.prisma.calibrationAnchor.createMany({
            data: anchorsToCreate,
        });

        // TODO: Send notifications to QA TL and AM/SDM for anchor validation
    }

    // ============================================
    // ANCHOR VALIDATION
    // ============================================

    async validateAnchor(anchorId: string, userId: string, approved: boolean, rejectionReason?: string) {
        const anchor = await this.prisma.calibrationAnchor.findUnique({
            where: { id: anchorId },
            include: {
                session: true,
                qaTlApprover: true,
                amSdmApprover: true,
            },
        });

        if (!anchor) {
            throw new NotFoundException('Anchor not found');
        }

        // Determine if user is QA TL or AM/SDM
        const participant = await this.prisma.calibrationParticipant.findFirst({
            where: {
                sessionId: anchor.sessionId,
                userId,
            },
        });

        if (!participant) {
            throw new ForbiddenException('You are not a participant in this calibration session');
        }

        const isQaTl = participant.role === CalibrationParticipantRole.QA_TL;
        const isAmSdm = participant.role === CalibrationParticipantRole.AM_SDM;

        if (!isQaTl && !isAmSdm) {
            throw new ForbiddenException('Only QA TL or AM/SDM can validate anchors');
        }

        // Update anchor with approval
        const updateData: any = {};

        if (isQaTl) {
            updateData.qaTlApproved = approved;
            updateData.qaTlApprovedBy = userId;
            updateData.qaTlApprovedAt = new Date();
        }

        if (isAmSdm) {
            updateData.amSdmApproved = approved;
            updateData.amSdmApprovedBy = userId;
            updateData.amSdmApprovedAt = new Date();
        }

        if (!approved && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        const updatedAnchor = await this.prisma.calibrationAnchor.update({
            where: { id: anchorId },
            data: updateData,
        });

        // Check if both parties have responded
        const bothResponded = updatedAnchor.qaTlApproved !== null && updatedAnchor.amSdmApproved !== null;

        if (bothResponded) {
            // Check if both approved
            if (updatedAnchor.qaTlApproved && updatedAnchor.amSdmApproved) {
                // Both approved - mark as VALIDATED
                await this.prisma.calibrationAnchor.update({
                    where: { id: anchorId },
                    data: { status: PrismaAnchorStatus.VALIDATED },
                });
            } else if (!updatedAnchor.qaTlApproved || !updatedAnchor.amSdmApproved) {
                // At least one rejected - mark as NON_MATCHING and replace
                await this.prisma.calibrationAnchor.update({
                    where: { id: anchorId },
                    data: { status: PrismaAnchorStatus.NON_MATCHING },
                });

                // Find replacement anchor in the same score range
                await this.replaceAnchor(anchor.sessionId, anchor.scoreRange, anchorId);
            }
        }

        // Check if all anchors are validated
        await this.checkAndOpenScoring(anchor.sessionId);

        return updatedAnchor;
    }

    private async replaceAnchor(sessionId: string, scoreRange: string, excludeAnchorId: string) {
        const session = await this.getSessionById(sessionId);

        // Get excluded audit IDs (already used or rejected)
        const existingAnchors = await this.prisma.calibrationAnchor.findMany({
            where: { sessionId },
            select: { auditId: true },
        });

        const excludedAuditIds = existingAnchors.map((a: any) => a.auditId);

        // Determine score range
        let minScore: number, maxScore: number;
        if (scoreRange === 'HIGH') {
            minScore = session.highScoreMin;
            maxScore = session.highScoreMax;
        } else if (scoreRange === 'MID') {
            minScore = session.midScoreMin;
            maxScore = session.midScoreMax;
        } else {
            minScore = session.lowScoreMin;
            maxScore = session.lowScoreMax;
        }

        // Find replacement audit
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const replacementAudit = await this.prisma.audit.findFirst({
            where: {
                campaignId: session.campaignId,
                status: 'RELEASED',
                releasedAt: { gte: thirtyDaysAgo },
                dispute: null,
                score: { gte: minScore, lte: maxScore },
                id: { notIn: excludedAuditIds },
            },
            select: {
                id: true,
                score: true,
            },
        });

        if (!replacementAudit) {
            throw new BadRequestException(`No replacement anchor found for ${scoreRange} range`);
        }

        // Create new anchor
        await this.prisma.calibrationAnchor.create({
            data: {
                sessionId,
                auditId: replacementAudit.id,
                scoreRange,
                score: replacementAudit.score || 0,
                status: PrismaAnchorStatus.PENDING_VALIDATION,
            },
        });
    }

    private async checkAndOpenScoring(sessionId: string) {
        // Check if all anchors are validated
        const anchors = await this.prisma.calibrationAnchor.findMany({
            where: { sessionId },
        });

        const allValidated = anchors.every((a: CalibrationAnchor) => a.status === PrismaAnchorStatus.VALIDATED);

        if (allValidated && anchors.length >= 6) {
            // Create accuracy calibration tickets from validated anchors
            const validatedAnchors = anchors.filter((a: CalibrationAnchor) => a.status === PrismaAnchorStatus.VALIDATED);

            // Randomly select 3 from the 6 validated anchors
            const selectedAnchors = this.shuffleArray(validatedAnchors).slice(0, 3);

            await this.prisma.calibrationTicket.createMany({
                data: selectedAnchors.map((anchor: CalibrationAnchor) => ({
                    sessionId,
                    auditId: anchor.auditId,
                    ticketId: `ANCHOR_${anchor.id}`,
                    type: PrismaTicketType.ACCURACY,
                    scoreRange: anchor.scoreRange || '',
                    anchorScore: anchor.score,
                })),
            });

            // Open scoring
            await this.prisma.calibrationSession.update({
                where: { id: sessionId },
                data: {
                    status: PrismaSessionStatus.SCORING_OPEN,
                    scoringOpenedAt: new Date(),
                },
            });

            // TODO: Send notifications to raters
        }
    }

    // ============================================
    // SCORING
    // ============================================

    async submitScore(dto: SubmitCalibrationScoreDto, userId: string) {
        // Verify user is a participant
        const participant = await this.prisma.calibrationParticipant.findFirst({
            where: {
                sessionId: dto.sessionId,
                userId,
            },
        });

        if (!participant) {
            throw new ForbiddenException('You are not a participant in this session');
        }

        // Verify ticket exists
        const ticket = await this.prisma.calibrationTicket.findUnique({
            where: { id: dto.ticketId },
        });

        if (!ticket || ticket.sessionId !== dto.sessionId) {
            throw new NotFoundException('Ticket not found in this session');
        }

        // Check if score already exists (upsert)
        const existingScore = await this.prisma.calibrationScore.findUnique({
            where: {
                ticketId_participantId: {
                    ticketId: dto.ticketId,
                    participantId: participant.id,
                },
            },
        });

        const score = await this.prisma.calibrationScore.upsert({
            where: {
                ticketId_participantId: {
                    ticketId: dto.ticketId,
                    participantId: participant.id,
                },
            },
            create: {
                sessionId: dto.sessionId,
                ticketId: dto.ticketId,
                participantId: participant.id,
                totalScore: dto.totalScore,
                scoreDetails: dto.scoreDetails,
            },
            update: {
                totalScore: dto.totalScore,
                scoreDetails: dto.scoreDetails,
            },
        });

        // Check if participant has completed all scoring
        await this.checkParticipantCompletion(participant.id, dto.sessionId);

        return score;
    }

    private async checkParticipantCompletion(participantId: string, sessionId: string) {
        // Get all tickets for this session
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: { sessionId },
            select: { id: true },
        });

        // Get all scores by this participant
        const scores = await this.prisma.calibrationScore.findMany({
            where: {
                sessionId,
                participantId,
            },
            select: { ticketId: true },
        });

        const scoredTicketIds = new Set(scores.map((s: any) => s.ticketId));
        const allTicketIds = tickets.map((t: any) => t.id);

        const hasCompletedAll = allTicketIds.every((id: string) => scoredTicketIds.has(id));

        if (hasCompletedAll) {
            await this.prisma.calibrationParticipant.update({
                where: { id: participantId },
                data: {
                    hasCompletedScoring: true,
                    completedAt: new Date(),
                },
            });

            // Check if all participants have completed
            await this.checkAllParticipantsCompleted(sessionId);
        }
    }

    private async checkAllParticipantsCompleted(sessionId: string) {
        const participants = await this.prisma.calibrationParticipant.findMany({
            where: {
                sessionId,
                role: CalibrationParticipantRole.RATER, // Only check raters
            },
        });

        const allCompleted = participants.every((p: any) => p.hasCompletedScoring);

        if (allCompleted) {
            await this.prisma.calibrationSession.update({
                where: { id: sessionId },
                data: {
                    status: PrismaSessionStatus.SCORING_CLOSED,
                    scoringClosedAt: new Date(),
                },
            });

            // Auto-calculate results
            await this.calculateResults(sessionId);
        }
    }

    // ============================================
    // CALCULATIONS
    // ============================================

    async calculateResults(sessionId: string) {
        const session = await this.getSessionById(sessionId);

        // Calculate Reproducibility (between-rater consistency)
        const avgReproducibility = await this.calculateReproducibility(sessionId);

        // Calculate Repeatability (within-rater consistency)
        const avgRepeatability = await this.calculateRepeatability(sessionId);

        // Calculate total range
        const totalRange = await this.calculateTotalRange(sessionId);

        // Calculate R&R percentage
        const calculatedRnR = ((avgReproducibility + avgRepeatability) / totalRange) * 100;

        // Calculate Accuracy
        const avgAccuracyGap = await this.calculateAccuracy(sessionId);

        // Update session with results
        await this.prisma.calibrationSession.update({
            where: { id: sessionId },
            data: {
                avgReproducibility,
                avgRepeatability,
                totalRange,
                calculatedRnR,
                avgAccuracyGap,
                status: PrismaSessionStatus.COMPLETED,
                resultsPublishedAt: new Date(),
            },
        });

        // Create session-level result record
        await this.prisma.calibrationResult.create({
            data: {
                sessionId,
                userId: null, // Session-level result
                avgReproducibility,
                avgRepeatability,
                avgAccuracyGap,
                totalRange,
                calculatedRnR,
                passedRnR: calculatedRnR < session.targetRnR,
                passedAccuracy: avgAccuracyGap < session.targetAccuracy,
            },
        });

        // Calculate individual rater results
        await this.calculateIndividualResults(sessionId);

        return {
            avgReproducibility,
            avgRepeatability,
            totalRange,
            calculatedRnR,
            avgAccuracyGap,
            passedRnR: calculatedRnR < session.targetRnR,
            passedAccuracy: avgAccuracyGap < session.targetAccuracy,
        };
    }

    private async calculateReproducibility(sessionId: string): Promise<number> {
        // Get all reproducibility tickets
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: PrismaTicketType.REPRODUCIBILITY,
            },
            include: {
                scores: true,
            },
        });

        // Calculate standard deviation for each ticket
        const stdDevs: number[] = [];

        for (const ticket of tickets) {
            const scores = ticket.scores.map(s => s.totalScore);
            if (scores.length > 1) {
                const stdDev = this.calculateStandardDeviation(scores);
                stdDevs.push(stdDev);
            }
        }

        // Average of all standard deviations
        return stdDevs.length > 0
            ? stdDevs.reduce((sum, val) => sum + val, 0) / stdDevs.length
            : 0;
    }

    private async calculateRepeatability(sessionId: string): Promise<number> {
        // Get all repeatability tickets grouped by groupId
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: PrismaTicketType.REPEATABILITY,
            },
            include: {
                scores: {
                    include: {
                        participant: true,
                    },
                },
            },
        });

        // Group by groupId (each group has 2 passes)
        const groups = new Map<string, typeof tickets>();
        for (const ticket of tickets) {
            if (ticket.groupId) {
                if (!groups.has(ticket.groupId)) {
                    groups.set(ticket.groupId, []);
                }
                groups.get(ticket.groupId)!.push(ticket);
            }
        }

        // Calculate delta for each rater for each group
        const raterDeltas = new Map<string, number[]>();

        for (const [groupId, groupTickets] of groups) {
            if (groupTickets.length !== 2) continue;

            const [pass1, pass2] = groupTickets;

            // For each rater, calculate delta between their two scores
            const raterScores = new Map<string, number[]>();

            for (const score of [...pass1.scores, ...pass2.scores]) {
                const raterId = score.participant.userId;
                if (!raterScores.has(raterId)) {
                    raterScores.set(raterId, []);
                }
                raterScores.get(raterId)!.push(score.totalScore);
            }

            for (const [raterId, scores] of raterScores) {
                if (scores.length === 2) {
                    const delta = Math.abs(scores[0] - scores[1]);
                    if (!raterDeltas.has(raterId)) {
                        raterDeltas.set(raterId, []);
                    }
                    raterDeltas.get(raterId)!.push(delta);
                }
            }
        }

        // Calculate average delta per rater, then average across all raters
        const avgRaterDeltas: number[] = [];
        for (const deltas of raterDeltas.values()) {
            const avgDelta = deltas.reduce((sum, val) => sum + val, 0) / deltas.length;
            avgRaterDeltas.push(avgDelta);
        }

        return avgRaterDeltas.length > 0
            ? avgRaterDeltas.reduce((sum, val) => sum + val, 0) / avgRaterDeltas.length
            : 0;
    }

    private async calculateTotalRange(sessionId: string): Promise<number> {
        // Get all scores from all calibration types
        const scores = await this.prisma.calibrationScore.findMany({
            where: { sessionId },
            select: { totalScore: true },
        });

        if (scores.length === 0) return 0;

        const allScores = scores.map((s: any) => s.totalScore);
        const max = Math.max(...allScores);
        const min = Math.min(...allScores);

        return max - min;
    }

    private async calculateAccuracy(sessionId: string): Promise<number> {
        // Get all accuracy tickets
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: PrismaTicketType.ACCURACY,
            },
            include: {
                scores: true,
            },
        });

        // Calculate gap from anchor score for each rater
        const gaps: number[] = [];

        for (const ticket of tickets) {
            if (!ticket.anchorScore) continue;

            for (const score of ticket.scores) {
                const gap = Math.abs(score.totalScore - ticket.anchorScore);
                gaps.push(gap);
            }
        }

        // Average gap
        return gaps.length > 0
            ? gaps.reduce((sum, val) => sum + val, 0) / gaps.length
            : 0;
    }

    private async calculateIndividualResults(sessionId: string) {
        // Get all rater participants
        const participants = await this.prisma.calibrationParticipant.findMany({
            where: {
                sessionId,
                role: CalibrationParticipantRole.RATER,
            },
        });

        for (const participant of participants) {
            // Calculate individual accuracy
            const accuracyTickets = await this.prisma.calibrationTicket.findMany({
                where: {
                    sessionId,
                    type: PrismaTicketType.ACCURACY,
                },
                include: {
                    scores: {
                        where: { participantId: participant.id },
                    },
                },
            });

            const gaps: number[] = [];
            for (const ticket of accuracyTickets) {
                if (!ticket.anchorScore) continue;
                for (const score of ticket.scores) {
                    const gap = Math.abs(score.totalScore - ticket.anchorScore);
                    gaps.push(gap);
                }
            }

            const avgAccuracyGap = gaps.length > 0
                ? gaps.reduce((sum, val) => sum + val, 0) / gaps.length
                : null;

            // Get session-level results for comparison
            const session = await this.getSessionById(sessionId);

            await this.prisma.calibrationResult.create({
                data: {
                    sessionId,
                    userId: participant.userId,
                    avgAccuracyGap,
                    passedAccuracy: avgAccuracyGap !== null && avgAccuracyGap < session.targetAccuracy,
                },
            });
        }
    }

    private calculateStandardDeviation(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

        return Math.sqrt(variance);
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    async getMyCalibrationTasks(userId: string, status?: CalibrationSessionStatus) {
        const where: any = {
            participants: {
                some: {
                    userId,
                },
            },
        };

        if (status) {
            where.status = status as PrismaSessionStatus;
        }

        const sessions = await this.prisma.calibrationSession.findMany({
            where,
            include: {
                campaign: { select: { id: true, name: true } },
                participants: {
                    where: { userId },
                    select: {
                        role: true,
                        hasCompletedScoring: true,
                    },
                },
                _count: {
                    select: {
                        tickets: true,
                        scores: true,
                    },
                },
            },
            orderBy: { scheduledAt: 'desc' },
        });

        return sessions;
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
