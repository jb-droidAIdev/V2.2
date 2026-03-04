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
        from:
          process.env.SMTP_FROM || '"QMS Support" <mailer@flatworld.com.ph>',
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
        <title>${title || 'Quality Monitoring System'}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; color: #ffffff; font-family: Roboto, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 18px; line-height: 1.6;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%;">
          <tr>
            <td align="center" style="padding: 60px 15px;">
              <!-- Container Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 700px; background-color: #0f172a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
                <tr>
                  <td style="padding: 60px;">
                    <!-- Content Area -->
                    <div style="width: 100%;">
                      ${content}
                    </div>

                    <!-- Branded Signature -->
                    <div style="margin-top: 60px; border-top: 1px solid #1e293b; padding-top: 40px; text-align: left;">
                      <p style="color: #94a3b8; font-size: 18px; line-height: 1.5; margin: 0; font-weight: 500;">Best,</p>
                      <p style="color: #ffffff; font-size: 18px; line-height: 1.5; margin: 0; font-weight: 700;">QMS Support</p>
                      
                      <!-- Spacer below QMS Support equivalent to ~3 lines (approx 3 * 18 * 1.5 = ~80px) -->
                      <div style="height: 80px;"></div>
                      
                      <p style="color: #E21E26; font-size: 12px; margin: 0; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; text-align: center;">
                        QUALITY MONITORING SYSTEM NETWORK • CONFIDENTIALITY NOTICE
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Simple Footer -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 700px;">
                <tr>
                  <td style="padding: 30px 10px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      &copy; 2026 Quality Monitoring System. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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

  async sendPasswordResetEmail(data: { to: string; resetLink: string }) {
    const content = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; margin: 0; text-transform: uppercase;">
          QUALITY MONITORING SYSTEM
        </h1>
        <div style="height: 4px; width: 40px; background-color: #E21E26; margin: 15px auto;"></div>
        <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Security & Identity Portal</p>
      </div>

      <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 24px; text-align: left; letter-spacing: -0.5px;">Account Credential Reset</h2>
      
      <p style="color: #cbd5e1; line-height: 1.8; font-size: 17px; text-align: left; margin-bottom: 35px;">
        A request has been initiated to reset your <strong>Management Portal</strong> credentials. This action requires authorization via the secure gateway below:
      </p>

      <div style="text-align: center; margin: 45px 0;">
        <a href="${data.resetLink}" style="background-color: #E21E26; color: #ffffff; padding: 20px 45px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 18px; display: inline-block; box-shadow: 0 10px 30px rgba(226, 30, 38, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);">
          Update Password
        </a>
      </div>

      <div style="background-color: rgba(2, 6, 23, 0.4); border-left: 4px solid #E21E26; padding: 20px; border-radius: 8px; margin-bottom: 35px;">
        <p style="color: #E21E26; font-size: 14px; margin: 0; font-weight: 600;">
          <strong>Security Protocol:</strong> This link is strictly single-use and will expire in 30 minutes.
        </p>
      </div>

      <div style="padding: 0;">
        <p style="color: #ffffff; font-size: 17px; line-height: 1.6; text-align: left; font-style: italic;">
          If you did not authorize this request, your account remains secured with your existing credentials. No further action is required.
        </p>
      </div>
    `;

    const html = this.getBaseTemplate(content, 'Security Reset');
    return this.sendMail(data.to, 'QMS: Password Reset Authorization', html);
  }

  async sendCoachingReleasedToAgent(data: {
    to: string;
    agentName: string;
    ticketId: string;
    supervisorName: string;
  }) {
    const content = `
      <p>Hello ${data.agentName},</p>
      <p>A new Coaching Log has been released by ${data.supervisorName} regarding Ticket #${data.ticketId}.</p>
      <p>Please log in to the system, review the opportunity summary and action plan, and provide your detailed commitment for improvement.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audits" style="text-decoration: none; color: #0000EE;">[ Click here to view the Coaching Log ]</a></p>
      <p style="color: #666666;">"Do not reply to this email"</p>
    `;

    const html = this.getBaseTemplate(content, 'New Coaching Log Released');
    const subject = `📢 Release: Coaching Log for Ticket #${data.ticketId}`;
    return this.sendMail(data.to, subject, html);
  }
}
