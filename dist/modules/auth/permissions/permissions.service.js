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
exports.Permission = exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma.service");
let PermissionsService = class PermissionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserPermissions(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRole: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                },
                customPermissions: {
                    include: { permission: true }
                }
            }
        });
        if (!user)
            return [];
        const rolePermissions = user.userRole?.permissions.map(p => p.permission.code) || [];
        const customPermissions = user.customPermissions.map(p => p.permission.code) || [];
        return Array.from(new Set([...rolePermissions, ...customPermissions]));
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
var Permission;
(function (Permission) {
    Permission["AUDIT_CREATE"] = "AUDIT_CREATE";
    Permission["AUDIT_VIEW_SELF"] = "AUDIT_VIEW_SELF";
    Permission["AUDIT_VIEW_TEAM"] = "AUDIT_VIEW_TEAM";
    Permission["AUDIT_VIEW_ALL"] = "AUDIT_VIEW_ALL";
    Permission["AUDIT_DELETE"] = "AUDIT_DELETE";
    Permission["DISPUTE_CREATE"] = "DISPUTE_CREATE";
    Permission["DISPUTE_RESOLVE"] = "DISPUTE_RESOLVE";
    Permission["DISPUTE_REAPPEAL"] = "DISPUTE_REAPPEAL";
    Permission["DISPUTE_FINAL_VERDICT"] = "DISPUTE_FINAL_VERDICT";
    Permission["FORM_CREATE"] = "FORM_CREATE";
    Permission["FORM_EDIT"] = "FORM_EDIT";
    Permission["FORM_ARCHIVE"] = "FORM_ARCHIVE";
    Permission["CALIBRATION_CREATE"] = "CALIBRATION_CREATE";
    Permission["CALIBRATION_VIEW"] = "CALIBRATION_VIEW";
    Permission["CALIBRATION_MANAGE"] = "CALIBRATION_MANAGE";
    Permission["CALIBRATION_VALIDATE_ANCHOR"] = "CALIBRATION_VALIDATE_ANCHOR";
    Permission["CALIBRATION_SCORE"] = "CALIBRATION_SCORE";
    Permission["USER_MANAGE"] = "USER_MANAGE";
    Permission["CAMPAIGN_MANAGE"] = "CAMPAIGN_MANAGE";
    Permission["DASHBOARD_VIEW"] = "DASHBOARD_VIEW";
    Permission["PAGE_DASHBOARD"] = "PAGE_DASHBOARD";
    Permission["PAGE_DOSSIER"] = "PAGE_DOSSIER";
    Permission["PAGE_FORMS"] = "PAGE_FORMS";
    Permission["PAGE_AUDITS"] = "PAGE_AUDITS";
    Permission["PAGE_EVALUATE"] = "PAGE_EVALUATE";
    Permission["PAGE_CALIBRATION"] = "PAGE_CALIBRATION";
    Permission["PAGE_ADMIN"] = "PAGE_ADMIN";
})(Permission || (exports.Permission = Permission = {}));
//# sourceMappingURL=permissions.service.js.map