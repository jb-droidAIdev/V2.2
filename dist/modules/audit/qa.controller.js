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
exports.QaController = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("./audit.service");
const passport_1 = require("@nestjs/passport");
let QaController = class QaController {
    constructor(auditService) {
        this.auditService = auditService;
    }
    async getQueue(req) {
        return this.auditService.getQueue(req.user.id);
    }
};
exports.QaController = QaController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QaController.prototype, "getQueue", null);
exports.QaController = QaController = __decorate([
    (0, common_1.Controller)('qa'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], QaController);
//# sourceMappingURL=qa.controller.js.map