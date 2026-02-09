import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CalibrationService } from './calibration.service';
import {
    CreateCalibrationSessionDto,
    UpdateCalibrationSessionDto,
    ValidateAnchorDto,
    SubmitCalibrationScoreDto,
    GetSessionsQueryDto,
    GetMyCalibrationTasksDto,
} from './dto/calibration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('calibration')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalibrationController {
    constructor(private readonly calibrationService: CalibrationService) { }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    @Post('sessions')
    @Permissions(Permission.CALIBRATION_CREATE)
    async createSession(
        @Body() dto: CreateCalibrationSessionDto,
        @Request() req: any,
    ) {
        return this.calibrationService.createSession(dto, req.user.userId);
    }

    @Get('sessions')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getSessions(@Query() query: GetSessionsQueryDto) {
        return this.calibrationService.getSessions(query);
    }

    @Get('sessions/:id')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getSessionById(@Param('id') id: string) {
        return this.calibrationService.getSessionById(id);
    }

    @Put('sessions/:id')
    @Permissions(Permission.CALIBRATION_MANAGE)
    async updateSession(
        @Param('id') id: string,
        @Body() dto: UpdateCalibrationSessionDto,
    ) {
        return this.calibrationService.updateSession(id, dto);
    }

    @Delete('sessions/:id')
    @Permissions(Permission.CALIBRATION_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSession(@Param('id') id: string) {
        return this.calibrationService.deleteSession(id);
    }

    // ============================================
    // RANDOMIZATION
    // ============================================

    @Post('sessions/:id/randomize')
    @Permissions(Permission.CALIBRATION_MANAGE)
    async randomizeTickets(@Param('id') id: string) {
        return this.calibrationService.randomizeAllTickets(id);
    }

    // ============================================
    // ANCHOR VALIDATION
    // ============================================

    @Post('anchors/:id/validate')
    @Permissions(Permission.CALIBRATION_VALIDATE_ANCHOR)
    async validateAnchor(
        @Param('id') anchorId: string,
        @Body() dto: ValidateAnchorDto,
        @Request() req: any,
    ) {
        return this.calibrationService.validateAnchor(
            anchorId,
            req.user.userId,
            dto.approved,
            dto.rejectionReason,
        );
    }

    @Get('sessions/:id/anchors')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getSessionAnchors(@Param('id') sessionId: string) {
        const session = await this.calibrationService.getSessionById(sessionId) as any;
        return session.anchors;
    }

    // ============================================
    // SCORING
    // ============================================

    @Post('scores')
    @Permissions(Permission.CALIBRATION_SCORE)
    async submitScore(
        @Body() dto: SubmitCalibrationScoreDto,
        @Request() req: any,
    ) {
        return this.calibrationService.submitScore(dto, req.user.userId);
    }

    @Get('sessions/:id/tickets')
    @Permissions(Permission.CALIBRATION_SCORE)
    async getSessionTickets(@Param('id') sessionId: string) {
        const session = await this.calibrationService.getSessionById(sessionId) as any;
        return session.tickets;
    }

    @Get('sessions/:id/scores')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getSessionScores(@Param('id') sessionId: string) {
        const session = await this.calibrationService.getSessionById(sessionId) as any;
        return {
            tickets: session.tickets,
            totalScores: session._count.scores,
        };
    }

    // ============================================
    // RESULTS & CALCULATIONS
    // ============================================

    @Post('sessions/:id/calculate')
    @Permissions(Permission.CALIBRATION_MANAGE)
    async calculateResults(@Param('id') sessionId: string) {
        return this.calibrationService.calculateResults(sessionId);
    }

    @Get('sessions/:id/results')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getSessionResults(@Param('id') sessionId: string) {
        const session = await this.calibrationService.getSessionById(sessionId) as any;
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

    // ============================================
    // USER-SPECIFIC ENDPOINTS
    // ============================================

    @Get('my-tasks')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getMyCalibrationTasks(
        @Query() query: GetMyCalibrationTasksDto,
        @Request() req: any,
    ) {
        return this.calibrationService.getMyCalibrationTasks(
            req.user.userId,
            query.status,
        );
    }

    @Get('my-tasks/:sessionId')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getMyTaskDetails(
        @Param('sessionId') sessionId: string,
        @Request() req: any,
    ) {
        const session = await this.calibrationService.getSessionById(sessionId) as any;

        // Find user's participant record
        const participant = session.participants.find(
            (p: any) => p.userId === req.user.userId,
        );

        if (!participant) {
            return {
                error: 'You are not a participant in this session',
            };
        }

        // Get tickets assigned to this session
        const tickets = session.tickets;

        // Get user's scores
        const userScores = tickets.map((ticket: any) => {
            const score = ticket.scores.find(
                (s: any) => s.participant.userId === req.user.userId,
            );
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
                completed: userScores.filter((s: any) => s.scored).length,
                pending: userScores.filter((s: any) => !s.scored).length,
            },
        };
    }

    // ============================================
    // STATISTICS & ANALYTICS
    // ============================================

    @Get('statistics/campaign/:campaignId')
    @Permissions(Permission.CALIBRATION_VIEW)
    async getCampaignCalibrationStats(@Param('campaignId') campaignId: string) {
        const sessions = await this.calibrationService.getSessions({
            campaignId,
        });

        const completedSessions = sessions.data.filter(
            (s: any) => s.status === 'COMPLETED',
        );

        const avgRnR =
            completedSessions.length > 0
                ? completedSessions.reduce(
                    (sum: number, s: any) => sum + (s.calculatedRnR || 0),
                    0,
                ) / completedSessions.length
                : 0;

        const avgAccuracy =
            completedSessions.length > 0
                ? completedSessions.reduce(
                    (sum: number, s: any) => sum + (s.avgAccuracyGap || 0),
                    0,
                ) / completedSessions.length
                : 0;

        return {
            campaignId,
            totalSessions: sessions.total,
            completedSessions: completedSessions.length,
            avgRnR,
            avgAccuracy,
            sessions: completedSessions.map((s: any) => ({
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

    @Get('statistics/overview')
    @Permissions(Permission.CALIBRATION_VIEW)
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

        allSessions.data.forEach((session: any) => {
            if (byStatus[session.status as keyof typeof byStatus] !== undefined) {
                byStatus[session.status as keyof typeof byStatus]++;
            }
        });

        return {
            total: allSessions.total,
            byStatus,
            recentSessions: allSessions.data.slice(0, 10),
        };
    }
}
