"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./modules/auth/auth.module");
const campaigns_module_1 = require("./modules/campaigns/campaigns.module");
const forms_module_1 = require("./modules/forms/forms.module");
const ticket_ingest_module_1 = require("./modules/ticket-ingest/ticket-ingest.module");
const sampling_module_1 = require("./modules/sampling/sampling.module");
const audit_module_1 = require("./modules/audit/audit.module");
const sla_engine_module_1 = require("./modules/sla-engine/sla-engine.module");
const release_module_1 = require("./modules/release/release.module");
const dispute_module_1 = require("./modules/dispute/dispute.module");
const calibration_module_1 = require("./modules/calibration/calibration.module");
const rubric_revision_module_1 = require("./modules/rubric-revision/rubric-revision.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const mail_module_1 = require("./modules/mail/mail.module");
const global_module_1 = require("./global.module");
const users_module_1 = require("./modules/users/users.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [global_module_1.GlobalModule, auth_module_1.AuthModule, campaigns_module_1.CampaignsModule, forms_module_1.FormsModule, ticket_ingest_module_1.TicketIngestModule, sampling_module_1.SamplingModule, audit_module_1.AuditModule, sla_engine_module_1.SlaEngineModule, release_module_1.ReleaseModule, dispute_module_1.DisputeModule, calibration_module_1.CalibrationModule, rubric_revision_module_1.RubricRevisionModule, notifications_module_1.NotificationsModule, mail_module_1.MailModule, users_module_1.UsersModule, dashboard_module_1.DashboardModule],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map