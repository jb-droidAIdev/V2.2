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
exports.TicketIngestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const ticket_ingest_service_1 = require("./ticket-ingest.service");
const passport_1 = require("@nestjs/passport");
let TicketIngestController = class TicketIngestController {
    constructor(ingestService) {
        this.ingestService = ingestService;
    }
    async upload(campaignId, file, req) {
        const csvContent = file.buffer.toString('utf-8');
        return this.ingestService.ingestCsv(campaignId, req.user.id, file.originalname, csvContent);
    }
};
exports.TicketIngestController = TicketIngestController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':campaignId/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 50 * 1024 * 1024 }
    })),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TicketIngestController.prototype, "upload", null);
exports.TicketIngestController = TicketIngestController = __decorate([
    (0, common_1.Controller)('ingest'),
    __metadata("design:paramtypes", [ticket_ingest_service_1.TicketIngestService])
], TicketIngestController);
//# sourceMappingURL=ticket-ingest.controller.js.map