import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendMail(to: string, subject: string, html: string, text?: string) {
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
        } catch (error) {
            this.logger.error(`Error sending email to ${to}:`, error);
            throw error;
        }
    }

    async sendAuditReport(to: string, auditData: any) {
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
}
