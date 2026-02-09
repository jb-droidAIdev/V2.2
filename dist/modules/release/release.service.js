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
exports.ReleaseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const sla_engine_service_1 = require("../sla-engine/sla-engine.service");
const client_1 = require("@prisma/client");
let ReleaseService = class ReleaseService {
    constructor(prisma, slaEngine) {
        this.prisma = prisma;
        this.slaEngine = slaEngine;
    }
    async releaseAudits(auditIds, userId) {
        const results = [];
        for (const id of auditIds) {
            const audit = await this.prisma.audit.findUnique({ where: { id } });
            if (!audit || audit.status !== client_1.AuditStatus.SUBMITTED)
                continue;
            const now = new Date();
            const deadline = await this.slaEngine.calculateDueDate(now, 3, audit.campaignId);
            const updated = await this.prisma.audit.update({
                where: { id },
                data: {
                    status: client_1.AuditStatus.RELEASED,
                    releasedAt: now,
                    agentAckDeadline: deadline,
                    releaseInfo: {
                        create: {
                            releasedBy: userId,
                            releasedAt: now
                        }
                    }
                }
            });
            results.push(updated);
        }
        return { releasedCount: results.length };
    }
    async getPendingRelease() {
        return this.prisma.audit.findMany({
            where: { status: client_1.AuditStatus.SUBMITTED },
            include: {
                auditor: true,
                campaign: true,
                sampledTicket: { include: { ticket: true } }
            }
        });
    }
};
exports.ReleaseService = ReleaseService;
exports.ReleaseService = ReleaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sla_engine_service_1.SlaEngineService])
], ReleaseService);
//# sourceMappingURL=release.service.js.map