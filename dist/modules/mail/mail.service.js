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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let MailService = MailService_1 = class MailService {
    constructor() {
        this.logger = new common_1.Logger(MailService_1.name);
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendMail(to, subject, html, text) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"QMS Support" <support@qms.local>',
                to,
                subject,
                text: text || html.replace(/<[^>]*>?/gm, ''),
                html,
            });
            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        }
        catch (error) {
            this.logger.error(`Error sending email to ${to}:`, error);
            throw error;
        }
    }
    async sendAuditReport(to, auditData) {
        const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">New Audit Evaluation Released</h2>
        <p>A new audit has been completed for your recent ticket.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p><strong>Ticket ID:</strong> ${auditData.ticketReference}</p>
          <p><strong>Score:</strong> <span style="font-size: 1.2em; color: ${auditData.score >= 90 ? '#10b981' : '#ef4444'};">${auditData.score}%</span></p>
          <p><strong>Evaluator:</strong> ${auditData.auditorName}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" 
             style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Detailed Report
          </a>
        </p>
      </div>
    `;
        return this.sendMail(to, `Audit Report: ${auditData.ticketReference}`, html);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map