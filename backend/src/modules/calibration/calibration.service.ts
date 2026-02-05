import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CalibrationService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.calibrationSession.findMany({
            include: {
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: { scheduledAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const session = await this.prisma.calibrationSession.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true }
                        }
                    }
                },
                scores: true
            },
        });
        if (!session) throw new NotFoundException('Calibration session not found');
        return session;
    }

    async create(data: { title: string; scheduledAt: Date; participantIds: string[] }) {
        return this.prisma.calibrationSession.create({
            data: {
                title: data.title,
                scheduledAt: data.scheduledAt,
                status: 'SCHEDULED',
                participants: {
                    create: data.participantIds.map(userId => ({ userId }))
                }
            },
            include: {
                participants: true
            }
        });
    }

    async updateStatus(id: string, status: string) {
        return this.prisma.calibrationSession.update({
            where: { id },
            data: { status }
        });
    }

    async submitScore(sessionId: string, userId: string, ticketId: string, scoreJson: any) {
        return this.prisma.calibrationScore.create({
            data: {
                sessionId,
                userId,
                ticketId,
                scoreJson
            }
        });
    }

    async getSessionStats(id: string) {
        const session = await this.findOne(id);
        const scores = session.scores || [];

        // Logic to calculate variance, average, etc.
        // This is a placeholder for actual statistics logic
        return {
            totalParticipants: session.participants.length,
            submittedScores: scores.length,
            // ... more stats
        };
    }
}
