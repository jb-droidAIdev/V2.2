"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketIngestModule = void 0;
const common_1 = require("@nestjs/common");
const ticket_ingest_service_1 = require("./ticket-ingest.service");
const ticket_ingest_controller_1 = require("./ticket-ingest.controller");
let TicketIngestModule = class TicketIngestModule {
};
exports.TicketIngestModule = TicketIngestModule;
exports.TicketIngestModule = TicketIngestModule = __decorate([
    (0, common_1.Module)({
        providers: [ticket_ingest_service_1.TicketIngestService],
        controllers: [ticket_ingest_controller_1.TicketIngestController],
        exports: [ticket_ingest_service_1.TicketIngestService],
    })
], TicketIngestModule);
//# sourceMappingURL=ticket-ingest.module.js.map