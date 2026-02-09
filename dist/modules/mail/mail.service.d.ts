export declare class MailService {
    private transporter;
    private readonly logger;
    constructor();
    sendMail(to: string, subject: string, html: string, text?: string): Promise<any>;
    sendAuditReport(to: string, auditData: any): Promise<any>;
}
