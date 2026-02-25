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

  async sendMail(
    to: string | string[],
    subject: string,
    html: string,
    cc?: string | string[],
    text?: string,
  ) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"QMS Support" <support@qms.local>',
        to,
        cc,
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

  private getBaseTemplate(content: string, title?: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'QMS Notification'}</title>
      </head>
      <body style="margin: 0; padding: 40px; color: #000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; line-height: 1.6; background-color: #ffffff;">
        <div style="max-width: 600px;">
          ${content}
        </div>
      </body>
      </html>
    `;
  }

  async sendNewAuditToAgent(data: {
    to: string;
    agentName: string;
    ticketId: string;
    score: number;
    auditorName: string;
    campaignName: string;
  }) {
    const content = `
      <p>Hello ${data.agentName},</p>
      <p>A new performance evaluation for Ticket #${data.ticketId} is now available for your review. We encourage you to examine the feedback to identify strengths and development goals.</p>
      <div>• Performance Score: ${data.score}%</div>
      <div>• Campaign: ${data.campaignName}</div>
      <div>• Quality Auditor: ${data.auditorName}</div>
      <p>Requirement: Please log in to acknowledge this evaluation within 3 business days.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" style="text-decoration: none; color: #0000EE;">[ Click here to view the report ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'New Audit Release');
    const subject = `📊 Release: Audit Evaluation for #${data.ticketId}`;
    return this.sendMail(data.to, subject, html);
  }

  async sendNewAuditToOps(data: {
    to: string;
    cc: string[];
    opsTlName: string;
    agentName: string;
    ticketId: string;
    score: number;
    auditorName: string;
    campaignName: string;
    interactionDate: string;
    isAutoFailed: boolean;
  }) {
    const content = `
      <p>Hello ${data.opsTlName},</p>
      <p>A new performance evaluation for Ticket #${data.ticketId} (${data.agentName}) has been finalized and released to the agent.</p>
      <div>• Performance Score: ${data.score}%</div>
      <div>• Interaction Date: ${data.interactionDate}</div>
      <div>• Auto-Fail Status: ${data.isAutoFailed ? 'YES' : 'No'}</div>
      <div>• Quality Auditor: ${data.auditorName}</div>
      <p>Requirement: Please review the results and ensure any necessary coaching is documented in the QMS Coaching Log.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" style="text-decoration: none; color: #0000EE;">[ Click here to view the dashboard ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(
      content,
      'Manager Evaluation Notification',
    );
    const subject = `📊 Alert: New Audit for ${data.agentName} (#${data.ticketId})`;
    return this.sendMail(data.to, subject, html, data.cc);
  }

  async sendDisputeToAuditor(data: {
    to: string;
    auditorName: string;
    ticketId: string;
    agentName: string;
    opsTlName: string;
    reason: string;
  }) {
    const content = `
      <p>Hello ${data.auditorName},</p>
      <p>A formal dispute has been filed for Ticket #${data.ticketId} (${data.agentName}) by ${data.opsTlName}. Please review the challenge and provide your initial verdict.</p>
      <div>• Dispute Reason: ${data.reason}</div>
      <p>Requirement: Please submit your verdict (Accept/Reject) within the 24-hour turnaround window.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/disputes" style="text-decoration: none; color: #0000EE;">[ Click here to review the dispute ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'Dispute Review Required');
    return this.sendMail(data.to, `⚠️ Dispute: Ticket #${data.ticketId}`, html);
  }

  async sendDisputeToQaLeadership(data: {
    to: string;
    cc: string[];
    qaTlName: string;
    ticketId: string;
    agentName: string;
    auditorName: string;
    opsTlName: string;
  }) {
    const content = `
      <p>Hello ${data.qaTlName},</p>
      <p>A performance challenge has been filed for Ticket #${data.ticketId}. This notification is for your visibility and SLA monitoring.</p>
      <div>• Agent: ${data.agentName}</div>
      <div>• Original Auditor: ${data.auditorName}</div>
      <div>• Raised By: ${data.opsTlName}</div>
      <p>Requirement: No immediate action required. Please monitor the SLA for the auditor's response.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/disputes" style="text-decoration: none; color: #0000EE;">[ Open Dispute Dashboard ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'Dispute Monitor');
    return this.sendMail(
      data.to,
      `ℹ️ Dispute Monitor: #${data.ticketId}`,
      html,
      data.cc,
    );
  }

  async sendReappealToQaLeadership(data: {
    to: string;
    cc: string[];
    qaTlName: string;
    ticketId: string;
    agentName: string;
    auditorName: string;
    reason: string;
  }) {
    const content = `
      <p>Hello ${data.qaTlName},</p>
      <p>The dispute for Ticket #${data.ticketId} has been escalated to a Re-appeal. You have been assigned as the final arbiter for this case.</p>
      <div>• Re-appeal rationale: ${data.reason}</div>
      <div>• Agent: ${data.agentName}</div>
      <div>• Original Auditor: ${data.auditorName}</div>
      <p>Requirement: Please perform a binding review and provide the final verdict.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/disputes" style="text-decoration: none; color: #0000EE;">[ Review Re-appeal Evidence ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'Re-appeal Escalation');
    return this.sendMail(
      data.to,
      `‼️ URGENT: Re-appeal for #${data.ticketId}`,
      html,
      data.cc,
    );
  }

  async sendResolutionToAgent(data: {
    to: string;
    agentName: string;
    ticketId: string;
    verdict: 'ACCEPTED' | 'REJECTED';
    rationale: string;
  }) {
    const content = `
      <p>Hello ${data.agentName},</p>
      <p>The formal review of your dispute for Ticket #${data.ticketId} has been concluded.</p>
      <div>• Outcome: ${data.verdict === 'ACCEPTED' ? 'ACCEPTED' : 'UPHELD'}</div>
      <div>• Rationale: ${data.rationale}</div>
      <p>Requirement: Please review the updated audit results in your dashboard.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" style="text-decoration: none; color: #0000EE;">[ View Audit Results ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'Dispute Resolution Concluded');
    return this.sendMail(
      data.to,
      `✅ Result: Dispute for #${data.ticketId}`,
      html,
    );
  }

  async sendResolutionToOps(data: {
    to: string;
    cc: string[];
    opsTlName: string;
    agentName: string;
    ticketId: string;
    verdict: 'ACCEPTED' | 'REJECTED';
    rationale: string;
  }) {
    const content = `
      <p>Hello ${data.opsTlName},</p>
      <p>The dispute workflow for Ticket #${data.ticketId} (${data.agentName}) has been finalized and closed.</p>
      <div>• Final Status: ${data.verdict === 'ACCEPTED' ? 'CORRECTION APPLIED' : 'ORIGINAL SCORE REMAINS'}</div>
      <div>• Closing Rationale: ${data.rationale}</div>
      <p>Requirement: Please ensure the agent is coached on the final results and all internal logs are updated.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" style="text-decoration: none; color: #0000EE;">[ Open Case Closure Dashboard ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'Case Closure Notification');
    return this.sendMail(
      data.to,
      `✅ Final Verdict: #${data.ticketId}`,
      html,
      data.cc,
    );
  }
}
