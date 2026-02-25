import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
    // Mock the transporter's sendMail method
    (service as any).transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send new audit email to agent', async () => {
    const result = await service.sendNewAuditToAgent({
      to: 'agent@example.com',
      agentName: 'Agent Smith',
      ticketId: '12345',
      score: 95,
      auditorName: 'Auditor X',
      campaignName: 'Campaign A',
    });
    expect(result).toBeDefined();
    expect(result.messageId).toBe('test-id');
  });

  it('should send dispute email to auditor', async () => {
    const result = await service.sendDisputeToAuditor({
      to: 'auditor@example.com',
      auditorName: 'Auditor X',
      ticketId: '12345',
      agentName: 'Agent Smith',
      opsTlName: 'Ops TL',
      reason: 'Incorrect scoring',
    });
    expect(result).toBeDefined();
  });

  it('should send resolution email to agent', async () => {
    const result = await service.sendResolutionToAgent({
      to: 'agent@example.com',
      agentName: 'Agent Smith',
      ticketId: '12345',
      verdict: 'ACCEPTED',
      rationale: 'Valid challenge',
    });
    expect(result).toBeDefined();
  });
});
