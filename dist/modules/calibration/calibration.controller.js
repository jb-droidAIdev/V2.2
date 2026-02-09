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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationController = void 0;
const common_1 = require("@nestjs/common");
const calibration_service_1 = require("./calibration.service");
const calibration_dto_1 = require("./dto/calibration.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions/permissions.decorator");
const permissions_service_1 = require("../auth/permissions/permissions.service");
let CalibrationController = class CalibrationController {
    constructor(calibrationService) {
        this.calibrationService = calibrationService;
    }
    async createSession(dto, req) {
        return this.calibrationService.createSession(dto, req.user.userId);
    }
    async getSessions(query) {
        return this.calibrationService.getSessions(query);
    }
    async getSessionById(id) {
        return this.calibrationService.getSessionById(id);
    }
    async updateSession(id, dto) {
        return this.calibrationService.updateSession(id, dto);
    }
    async deleteSession(id) {
        return this.calibrationService.deleteSession(id);
    }
    async randomizeTickets(id) {
        return this.calibrationService.randomizeAllTickets(id);
    }
    async validateAnchor(anchorId, dto, req) {
        return this.calibrationService.validateAnchor(anchorId, req.user.userId, dto.approved, dto.rejectionReason);
    }
    async getSessionAnchors(sessionId) {
        const session = await this.calibrationService.getSessionById(sessionId);
        return session.anchors;
    }
    async submitScore(dto, req) {
        return this.calibrationService.submitScore(dto, req.user.userId);
    }
    async getSessionTickets(sessionId) {
        const session = await this.calibrationService.getSessionById(sessionId);
        return session.tickets;
    }
    async getSessionScores(sessionId) {
        const session = await this.calibrationService.getSessionById(sessionId);
        return {
            tickets: session.tickets,
            totalScores: session._count.scores,
        };
    }
    async calculateResults(sessionId) {
        return this.calibrationService.calculateResults(sessionId);
    }
    async getSessionResults(sessionId) {
        const session = await this.calibrationService.getSessionById(sessionId);
        return {
            session: {
                id: session.id,
                title: session.title,
                status: session.status,
                avgReproducibility: session.avgReproducibility,
                avgRepeatability: session.avgRepeatability,
                totalRange: session.totalRange,
                calculatedRnR: session.calculatedRnR,
                avgAccuracyGap: session.avgAccuracyGap,
                targetRnR: session.targetRnR,
                targetAccuracy: session.targetAccuracy,
            },
            results: session.results,
        };
    }
    async getMyCalibrationTasks(query, req) {
        return this.calibrationService.getMyCalibrationTasks(req.user.userId, query.status);
    }
    async getMyTaskDetails(sessionId, req) {
        const session = await this.calibrationService.getSessionById(sessionId);
        const participant = session.participants.find((p) => p.userId === req.user.userId);
        if (!participant) {
            return {
                error: 'You are not a participant in this session',
            };
        }
        const tickets = session.tickets;
        const userScores = tickets.map((ticket) => {
            const score = ticket.scores.find((s) => s.participant.userId === req.user.userId);
            return {
                ticketId: ticket.id,
                type: ticket.type,
                scored: !!score,
                score: score?.totalScore,
            };
        });
        return {
            session: {
                id: session.id,
                title: session.title,
                description: session.description,
                status: session.status,
                scheduledAt: session.scheduledAt,
            },
            participant: {
                id: participant.id,
                userId: participant.userId,
                role: participant.role,
                hasCompletedScoring: participant.hasCompletedScoring,
                completedAt: participant.completedAt,
            },
            tickets,
            progress: {
                total: tickets.length,
                completed: userScores.filter((s) => s.scored).length,
                pending: userScores.filter((s) => !s.scored).length,
            },
        };
    }
    async getCampaignCalibrationStats(campaignId) {
        const sessions = await this.calibrationService.getSessions({
            campaignId,
        });
        const completedSessions = sessions.data.filter((s) => s.status === 'COMPLETED');
        const avgRnR = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + (s.calculatedRnR || 0), 0) / completedSessions.length
            : 0;
        const avgAccuracy = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + (s.avgAccuracyGap || 0), 0) / completedSessions.length
            : 0;
        return {
            campaignId,
            totalSessions: sessions.total,
            completedSessions: completedSessions.length,
            avgRnR,
            avgAccuracy,
            sessions: completedSessions.map((s) => ({
                id: s.id,
                title: s.title,
                scheduledAt: s.scheduledAt,
                calculatedRnR: s.calculatedRnR,
                avgAccuracyGap: s.avgAccuracyGap,
                passedRnR: (s.calculatedRnR || 0) < (s.targetRnR || 15),
                passedAccuracy: (s.avgAccuracyGap || 0) < (s.targetAccuracy || 5),
            })),
        };
    }
    async getCalibrationOverview() {
        const allSessions = await this.calibrationService.getSessions({
            page: 1,
            limit: 1000,
        });
        const byStatus = {
            SCHEDULED: 0,
            ANCHOR_PENDING: 0,
            SCORING_OPEN: 0,
            SCORING_CLOSED: 0,
            COMPLETED: 0,
            CANCELLED: 0,
        };
        allSessions.data.forEach((session) => {
            if (byStatus[session.status] !== undefined) {
                byStatus[session.status]++;
            }
        });
        return {
            total: allSessions.total,
            byStatus,
            recentSessions: allSessions.data.slice(0, 10),
        };
    }
};
exports.CalibrationController = CalibrationController;
__decorate([
    (0, common_1.Post)('sessions'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_CREATE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calibration_dto_1.CreateCalibrationSessionDto, Object]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calibration_dto_1.GetSessionsQueryDto]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessionById", null);
__decorate([
    (0, common_1.Put)('sessions/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, calibration_dto_1.UpdateCalibrationSessionDto]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_MANAGE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('sessions/:id/randomize'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "randomizeTickets", null);
__decorate([
    (0, common_1.Post)('anchors/:id/validate'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VALIDATE_ANCHOR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, calibration_dto_1.ValidateAnchorDto, Object]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "validateAnchor", null);
__decorate([
    (0, common_1.Get)('sessions/:id/anchors'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessionAnchors", null);
__decorate([
    (0, common_1.Post)('scores'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_SCORE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calibration_dto_1.SubmitCalibrationScoreDto, Object]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "submitScore", null);
__decorate([
    (0, common_1.Get)('sessions/:id/tickets'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_SCORE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessionTickets", null);
__decorate([
    (0, common_1.Get)('sessions/:id/scores'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessionScores", null);
__decorate([
    (0, common_1.Post)('sessions/:id/calculate'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "calculateResults", null);
__decorate([
    (0, common_1.Get)('sessions/:id/results'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getSessionResults", null);
__decorate([
    (0, common_1.Get)('my-tasks'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calibration_dto_1.GetMyCalibrationTasksDto, Object]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getMyCalibrationTasks", null);
__decorate([
    (0, common_1.Get)('my-tasks/:sessionId'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getMyTaskDetails", null);
__decorate([
    (0, common_1.Get)('statistics/campaign/:campaignId'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __param(0, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getCampaignCalibrationStats", null);
__decorate([
    (0, common_1.Get)('statistics/overview'),
    (0, permissions_decorator_1.Permissions)(permissions_service_1.Permission.CALIBRATION_VIEW),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalibrationController.prototype, "getCalibrationOverview", null);
exports.CalibrationController = CalibrationController = __decorate([
    (0, common_1.Controller)('calibration'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [calibration_service_1.CalibrationService])
], CalibrationController);
//# sourceMappingURL=calibration.controller.js.map