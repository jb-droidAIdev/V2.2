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
exports.SlaEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SlaEngineService = class SlaEngineService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateDueDate(startDate, businessDaysToAdd, campaignId) {
        const holidays = await this.getHolidays(campaignId);
        let currentDate = new Date(startDate);
        let daysAdded = 0;
        while (daysAdded < businessDaysToAdd) {
            currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
            if (this.isBusinessDay(currentDate, holidays)) {
                daysAdded++;
            }
        }
        return currentDate;
    }
    isBusinessDay(date, holidays) {
        const estDateString = date.toLocaleDateString("en-US", { timeZone: "America/New_York" });
        const estDate = new Date(estDateString);
        const dayOfWeek = estDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
        const year = estDate.getFullYear();
        const month = String(estDate.getMonth() + 1).padStart(2, '0');
        const day = String(estDate.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        if (holidays.has(isoDate)) {
            return false;
        }
        return true;
    }
    async getHolidays(campaignId) {
        return new Set();
    }
};
exports.SlaEngineService = SlaEngineService;
exports.SlaEngineService = SlaEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlaEngineService);
//# sourceMappingURL=sla-engine.service.js.map