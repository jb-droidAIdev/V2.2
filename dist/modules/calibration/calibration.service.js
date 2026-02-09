"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const calibration_dto_1 = require("./dto/calibration.dto");
const client_1 = require("@prisma/client");
let CalibrationService = class CalibrationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSession(dto, createdById) {
        const session = await this.prisma.calibrationSession.create({
            data: {
                campaignId: dto.campaignId,
                title: dto.title,
                description: dto.description,
                scheduledAt: new Date(dto.scheduledAt),
                status: client_1.CalibrationSessionStatus.SCHEDULED,
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
                        ...dto.raterUserIds.map(userId => ({
                            userId,
                            role: calibration_dto_1.CalibrationParticipantRole.RATER,
                        })),
                        ...(dto.qaTlUserId ? [{
                                userId: dto.qaTlUserId,
                                role: calibration_dto_1.CalibrationParticipantRole.QA_TL,
                            }] : []),
                        ...(dto.amSdmUserId ? [{
                                userId: dto.amSdmUserId,
                                role: calibration_dto_1.CalibrationParticipantRole.AM_SDM,
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
        return session;
    }
    async getSessions(query) {
        const where = {};
        if (query.campaignId) {
            where.campaignId = query.campaignId;
        }
        if (query.status) {
            where.status = query.status;
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
    async getSessionById(id) {
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
            throw new common_1.NotFoundException('Calibration session not found');
        }
        return session;
    }
    async updateSession(id, dto) {
        const session = await this.prisma.calibrationSession.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
                ...(dto.status && { status: dto.status }),
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
    async deleteSession(id) {
        await this.prisma.calibrationSession.delete({
            where: { id },
        });
        return { message: 'Session deleted successfully' };
    }
    async randomizeAllTickets(sessionId) {
        const session = await this.getSessionById(sessionId);
        await this.randomizeReproducibility(sessionId, session.reproducibilityTicketCount);
        await this.randomizeRepeatability(sessionId, session.repeatabilityTicketCount);
        await this.randomizeAccuracy(sessionId);
        await this.prisma.calibrationSession.update({
            where: { id: sessionId },
            data: { status: client_1.CalibrationSessionStatus.ANCHOR_PENDING },
        });
        return { message: 'Tickets randomized successfully' };
    }
    async randomizeReproducibility(sessionId, count) {
        const session = await this.getSessionById(sessionId);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const audits = await this.prisma.audit.findMany({
            where: {
                campaignId: session.campaignId,
                status: client_1.AuditStatus.RELEASED,
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
            throw new common_1.BadRequestException(`Not enough audits available for reproducibility. Need ${count}, found ${audits.length}`);
        }
        const selectedAudits = this.shuffleArray(audits).slice(0, count);
        await this.prisma.calibrationTicket.createMany({
            data: selectedAudits.map((audit) => ({
                sessionId,
                auditId: audit.id,
                ticketId: audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'UNKNOWN',
                type: client_1.CalibrationTicketType.REPRODUCIBILITY,
                agentName: audit.agent.name,
                metadata: audit.sampledTicket?.ticket?.metadata || audit.metadata,
            })),
        });
    }
    async randomizeRepeatability(sessionId, count) {
        const session = await this.getSessionById(sessionId);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const audits = await this.prisma.audit.findMany({
            where: {
                campaignId: session.campaignId,
                status: client_1.AuditStatus.RELEASED,
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
            throw new common_1.BadRequestException(`Not enough audits available for repeatability. Need ${count}, found ${audits.length}`);
        }
        const selectedAudits = this.shuffleArray(audits).slice(0, count);
        const ticketsToCreate = [];
        for (const audit of selectedAudits) {
            const groupId = this.generateUUID();
            const ticketId = audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'UNKNOWN';
            ticketsToCreate.push({
                sessionId,
                auditId: audit.id,
                ticketId,
                type: client_1.CalibrationTicketType.REPEATABILITY,
                passNumber: 1,
                groupId,
                agentName: audit.agent.name,
                metadata: audit.sampledTicket?.ticket?.metadata || audit.metadata,
            });
            ticketsToCreate.push({
                sessionId,
                auditId: audit.id,
                ticketId,
                type: client_1.CalibrationTicketType.REPEATABILITY,
                passNumber: 2,
                groupId,
                agentName: audit.agent.name,
                metadata: audit.sampledTicket?.ticket?.metadata || audit.metadata,
            });
        }
        await this.prisma.calibrationTicket.createMany({
            data: ticketsToCreate,
        });
    }
    async randomizeAccuracy(sessionId) {
        const session = await this.getSessionById(sessionId);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const baseWhere = {
            campaignId: session.campaignId,
            status: client_1.AuditStatus.RELEASED,
            releasedAt: { gte: thirtyDaysAgo },
            dispute: null,
        };
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
        const selectedHigh = this.shuffleArray(highScoreAudits).slice(0, 2);
        const selectedMid = this.shuffleArray(midScoreAudits).slice(0, 2);
        const selectedLow = this.shuffleArray(lowScoreAudits).slice(0, 2);
        if (selectedHigh.length < 2 || selectedMid.length < 2 || selectedLow.length < 2) {
            throw new common_1.BadRequestException('Not enough audits in each score range for accuracy calibration');
        }
        const anchorsToCreate = [
            ...selectedHigh.map((audit) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'HIGH',
                score: audit.score || 0,
                status: client_1.CalibrationAnchorStatus.PENDING_VALIDATION,
            })),
            ...selectedMid.map((audit) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'MID',
                score: audit.score || 0,
                status: client_1.CalibrationAnchorStatus.PENDING_VALIDATION,
            })),
            ...selectedLow.map((audit) => ({
                sessionId,
                auditId: audit.id,
                scoreRange: 'LOW',
                score: audit.score || 0,
                status: client_1.CalibrationAnchorStatus.PENDING_VALIDATION,
            })),
        ];
        await this.prisma.calibrationAnchor.createMany({
            data: anchorsToCreate,
        });
    }
    async validateAnchor(anchorId, userId, approved, rejectionReason) {
        const anchor = await this.prisma.calibrationAnchor.findUnique({
            where: { id: anchorId },
            include: {
                session: true,
                qaTlApprover: true,
                amSdmApprover: true,
            },
        });
        if (!anchor) {
            throw new common_1.NotFoundException('Anchor not found');
        }
        const participant = await this.prisma.calibrationParticipant.findFirst({
            where: {
                sessionId: anchor.sessionId,
                userId,
            },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this calibration session');
        }
        const isQaTl = participant.role === calibration_dto_1.CalibrationParticipantRole.QA_TL;
        const isAmSdm = participant.role === calibration_dto_1.CalibrationParticipantRole.AM_SDM;
        if (!isQaTl && !isAmSdm) {
            throw new common_1.ForbiddenException('Only QA TL or AM/SDM can validate anchors');
        }
        const updateData = {};
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
        const bothResponded = updatedAnchor.qaTlApproved !== null && updatedAnchor.amSdmApproved !== null;
        if (bothResponded) {
            if (updatedAnchor.qaTlApproved && updatedAnchor.amSdmApproved) {
                await this.prisma.calibrationAnchor.update({
                    where: { id: anchorId },
                    data: { status: client_1.CalibrationAnchorStatus.VALIDATED },
                });
            }
            else if (!updatedAnchor.qaTlApproved || !updatedAnchor.amSdmApproved) {
                await this.prisma.calibrationAnchor.update({
                    where: { id: anchorId },
                    data: { status: client_1.CalibrationAnchorStatus.NON_MATCHING },
                });
                await this.replaceAnchor(anchor.sessionId, anchor.scoreRange, anchorId);
            }
        }
        await this.checkAndOpenScoring(anchor.sessionId);
        return updatedAnchor;
    }
    async replaceAnchor(sessionId, scoreRange, excludeAnchorId) {
        const session = await this.getSessionById(sessionId);
        const existingAnchors = await this.prisma.calibrationAnchor.findMany({
            where: { sessionId },
            select: { auditId: true },
        });
        const excludedAuditIds = existingAnchors.map((a) => a.auditId);
        let minScore, maxScore;
        if (scoreRange === 'HIGH') {
            minScore = session.highScoreMin;
            maxScore = session.highScoreMax;
        }
        else if (scoreRange === 'MID') {
            minScore = session.midScoreMin;
            maxScore = session.midScoreMax;
        }
        else {
            minScore = session.lowScoreMin;
            maxScore = session.lowScoreMax;
        }
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
            throw new common_1.BadRequestException(`No replacement anchor found for ${scoreRange} range`);
        }
        await this.prisma.calibrationAnchor.create({
            data: {
                sessionId,
                auditId: replacementAudit.id,
                scoreRange,
                score: replacementAudit.score || 0,
                status: client_1.CalibrationAnchorStatus.PENDING_VALIDATION,
            },
        });
    }
    async checkAndOpenScoring(sessionId) {
        const anchors = await this.prisma.calibrationAnchor.findMany({
            where: { sessionId },
        });
        const allValidated = anchors.every((a) => a.status === client_1.CalibrationAnchorStatus.VALIDATED);
        if (allValidated && anchors.length >= 6) {
            const validatedAnchors = anchors.filter((a) => a.status === client_1.CalibrationAnchorStatus.VALIDATED);
            const selectedAnchors = this.shuffleArray(validatedAnchors).slice(0, 3);
            await this.prisma.calibrationTicket.createMany({
                data: selectedAnchors.map((anchor) => ({
                    sessionId,
                    auditId: anchor.auditId,
                    ticketId: `ANCHOR_${anchor.id}`,
                    type: client_1.CalibrationTicketType.ACCURACY,
                    scoreRange: anchor.scoreRange || '',
                    anchorScore: anchor.score,
                })),
            });
            await this.prisma.calibrationSession.update({
                where: { id: sessionId },
                data: {
                    status: client_1.CalibrationSessionStatus.SCORING_OPEN,
                    scoringOpenedAt: new Date(),
                },
            });
        }
    }
    async submitScore(dto, userId) {
        const participant = await this.prisma.calibrationParticipant.findFirst({
            where: {
                sessionId: dto.sessionId,
                userId,
            },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('You are not a participant in this session');
        }
        const ticket = await this.prisma.calibrationTicket.findUnique({
            where: { id: dto.ticketId },
        });
        if (!ticket || ticket.sessionId !== dto.sessionId) {
            throw new common_1.NotFoundException('Ticket not found in this session');
        }
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
        await this.checkParticipantCompletion(participant.id, dto.sessionId);
        return score;
    }
    async checkParticipantCompletion(participantId, sessionId) {
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: { sessionId },
            select: { id: true },
        });
        const scores = await this.prisma.calibrationScore.findMany({
            where: {
                sessionId,
                participantId,
            },
            select: { ticketId: true },
        });
        const scoredTicketIds = new Set(scores.map((s) => s.ticketId));
        const allTicketIds = tickets.map((t) => t.id);
        const hasCompletedAll = allTicketIds.every((id) => scoredTicketIds.has(id));
        if (hasCompletedAll) {
            await this.prisma.calibrationParticipant.update({
                where: { id: participantId },
                data: {
                    hasCompletedScoring: true,
                    completedAt: new Date(),
                },
            });
            await this.checkAllParticipantsCompleted(sessionId);
        }
    }
    async checkAllParticipantsCompleted(sessionId) {
        const participants = await this.prisma.calibrationParticipant.findMany({
            where: {
                sessionId,
                role: calibration_dto_1.CalibrationParticipantRole.RATER,
            },
        });
        const allCompleted = participants.every((p) => p.hasCompletedScoring);
        if (allCompleted) {
            await this.prisma.calibrationSession.update({
                where: { id: sessionId },
                data: {
                    status: client_1.CalibrationSessionStatus.SCORING_CLOSED,
                    scoringClosedAt: new Date(),
                },
            });
            await this.calculateResults(sessionId);
        }
    }
    async calculateResults(sessionId) {
        const session = await this.getSessionById(sessionId);
        const avgReproducibility = await this.calculateReproducibility(sessionId);
        const avgRepeatability = await this.calculateRepeatability(sessionId);
        const totalRange = await this.calculateTotalRange(sessionId);
        const calculatedRnR = ((avgReproducibility + avgRepeatability) / totalRange) * 100;
        const avgAccuracyGap = await this.calculateAccuracy(sessionId);
        await this.prisma.calibrationSession.update({
            where: { id: sessionId },
            data: {
                avgReproducibility,
                avgRepeatability,
                totalRange,
                calculatedRnR,
                avgAccuracyGap,
                status: client_1.CalibrationSessionStatus.COMPLETED,
                resultsPublishedAt: new Date(),
            },
        });
        await this.prisma.calibrationResult.create({
            data: {
                sessionId,
                userId: null,
                avgReproducibility,
                avgRepeatability,
                avgAccuracyGap,
                totalRange,
                calculatedRnR,
                passedRnR: calculatedRnR < session.targetRnR,
                passedAccuracy: avgAccuracyGap < session.targetAccuracy,
            },
        });
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
    async calculateReproducibility(sessionId) {
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: client_1.CalibrationTicketType.REPRODUCIBILITY,
            },
            include: {
                scores: true,
            },
        });
        const stdDevs = [];
        for (const ticket of tickets) {
            const scores = ticket.scores.map(s => s.totalScore);
            if (scores.length > 1) {
                const stdDev = this.calculateStandardDeviation(scores);
                stdDevs.push(stdDev);
            }
        }
        return stdDevs.length > 0
            ? stdDevs.reduce((sum, val) => sum + val, 0) / stdDevs.length
            : 0;
    }
    async calculateRepeatability(sessionId) {
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: client_1.CalibrationTicketType.REPEATABILITY,
            },
            include: {
                scores: {
                    include: {
                        participant: true,
                    },
                },
            },
        });
        const groups = new Map();
        for (const ticket of tickets) {
            if (ticket.groupId) {
                if (!groups.has(ticket.groupId)) {
                    groups.set(ticket.groupId, []);
                }
                groups.get(ticket.groupId).push(ticket);
            }
        }
        const raterDeltas = new Map();
        for (const [groupId, groupTickets] of groups) {
            if (groupTickets.length !== 2)
                continue;
            const [pass1, pass2] = groupTickets;
            const raterScores = new Map();
            for (const score of [...pass1.scores, ...pass2.scores]) {
                const raterId = score.participant.userId;
                if (!raterScores.has(raterId)) {
                    raterScores.set(raterId, []);
                }
                raterScores.get(raterId).push(score.totalScore);
            }
            for (const [raterId, scores] of raterScores) {
                if (scores.length === 2) {
                    const delta = Math.abs(scores[0] - scores[1]);
                    if (!raterDeltas.has(raterId)) {
                        raterDeltas.set(raterId, []);
                    }
                    raterDeltas.get(raterId).push(delta);
                }
            }
        }
        const avgRaterDeltas = [];
        for (const deltas of raterDeltas.values()) {
            const avgDelta = deltas.reduce((sum, val) => sum + val, 0) / deltas.length;
            avgRaterDeltas.push(avgDelta);
        }
        return avgRaterDeltas.length > 0
            ? avgRaterDeltas.reduce((sum, val) => sum + val, 0) / avgRaterDeltas.length
            : 0;
    }
    async calculateTotalRange(sessionId) {
        const scores = await this.prisma.calibrationScore.findMany({
            where: { sessionId },
            select: { totalScore: true },
        });
        if (scores.length === 0)
            return 0;
        const allScores = scores.map((s) => s.totalScore);
        const max = Math.max(...allScores);
        const min = Math.min(...allScores);
        return max - min;
    }
    async calculateAccuracy(sessionId) {
        const tickets = await this.prisma.calibrationTicket.findMany({
            where: {
                sessionId,
                type: client_1.CalibrationTicketType.ACCURACY,
            },
            include: {
                scores: true,
            },
        });
        const gaps = [];
        for (const ticket of tickets) {
            if (!ticket.anchorScore)
                continue;
            for (const score of ticket.scores) {
                const gap = Math.abs(score.totalScore - ticket.anchorScore);
                gaps.push(gap);
            }
        }
        return gaps.length > 0
            ? gaps.reduce((sum, val) => sum + val, 0) / gaps.length
            : 0;
    }
    async calculateIndividualResults(sessionId) {
        const participants = await this.prisma.calibrationParticipant.findMany({
            where: {
                sessionId,
                role: calibration_dto_1.CalibrationParticipantRole.RATER,
            },
        });
        for (const participant of participants) {
            const accuracyTickets = await this.prisma.calibrationTicket.findMany({
                where: {
                    sessionId,
                    type: client_1.CalibrationTicketType.ACCURACY,
                },
                include: {
                    scores: {
                        where: { participantId: participant.id },
                    },
                },
            });
            const gaps = [];
            for (const ticket of accuracyTickets) {
                if (!ticket.anchorScore)
                    continue;
                for (const score of ticket.scores) {
                    const gap = Math.abs(score.totalScore - ticket.anchorScore);
                    gaps.push(gap);
                }
            }
            const avgAccuracyGap = gaps.length > 0
                ? gaps.reduce((sum, val) => sum + val, 0) / gaps.length
                : null;
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
    calculateStandardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(variance);
    }
    async getMyCalibrationTasks(userId, status) {
        const where = {
            participants: {
                some: {
                    userId,
                },
            },
        };
        if (status) {
            where.status = status;
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
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
};
exports.CalibrationService = CalibrationService;
exports.CalibrationService = CalibrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalibrationService);
//# sourceMappingURL=calibration.service.js.map