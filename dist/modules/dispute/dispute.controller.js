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
exports.DisputeController = void 0;
const common_1 = require("@nestjs/common");
const dispute_service_1 = require("./dispute.service");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let DisputeController = class DisputeController {
    constructor(disputeService) {
        this.disputeService = disputeService;
    }
    create(body, req) {
        return this.disputeService.createDispute(body.auditId, req.user.id, body);
    }
    qaVerdict(id, body, req) {
        return this.disputeService.qaVerdict(id, req.user.id, body.itemId, {
            verdict: body.verdict,
            comment: body.comment
        });
    }
    reappeal(id, body, req) {
        return this.disputeService.reappeal(id, req.user.id, body);
    }
    finalVerdict(id, body, req) {
        return this.disputeService.finalVerdict(id, req.user.id, body.itemId, {
            verdict: body.verdict,
            comment: body.comment
        });
    }
    findAll() {
        return this.disputeService.findAll();
    }
    findByAudit(auditId) {
        return this.disputeService.findByAudit(auditId);
    }
};
exports.DisputeController = DisputeController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.OPS_TL, client_1.Role.OPS_MANAGER, client_1.Role.QA_MANAGER, client_1.Role.SDM, client_1.Role.ADMIN),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.QA, client_1.Role.QA_TL, client_1.Role.QA_MANAGER, client_1.Role.ADMIN),
    (0, common_1.Patch)(':id/qa-verdict'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "qaVerdict", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.OPS_TL, client_1.Role.OPS_MANAGER, client_1.Role.QA_MANAGER, client_1.Role.SDM, client_1.Role.ADMIN),
    (0, common_1.Post)(':id/reappeal'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "reappeal", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.QA_TL, client_1.Role.ADMIN),
    (0, common_1.Patch)(':id/final-verdict'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "finalVerdict", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('audit/:auditId'),
    __param(0, (0, common_1.Param)('auditId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DisputeController.prototype, "findByAudit", null);
exports.DisputeController = DisputeController = __decorate([
    (0, common_1.Controller)('disputes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [dispute_service_1.DisputeService])
], DisputeController);
//# sourceMappingURL=dispute.controller.js.map