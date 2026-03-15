import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import { addHours, isAfter, differenceInHours } from 'date-fns';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Run every day at 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMidpointReminders() {
    this.logger.log('Starting daily coaching log midpoint reminders check...');

    try {
      // 1. Fetch unacknowledged coaching logs that haven't received a reminder
      const pendingLogs = (await this.prisma.coachingLog.findMany({
        where: {
          agentAckAt: null,
          reminderSent: false,
          releasedAt: { not: null },
        } as any,
        include: {
          audit: {
            include: {
              campaign: true,
              agent: true,
            },
          },
        },
      })) as any[];

      this.logger.log(`Found ${pendingLogs.length} pending coaching logs to check.`);

      let sentCount = 0;

      for (const log of pendingLogs) {
        if (!log.releasedAt) continue;

        const campaign = log.audit.campaign;
        const agent = log.audit.agent;
        
        // Use the new coachingAckWindowDays field (defaulting to 2 if somehow missing)
        const ackWindowDays = campaign.coachingAckWindowDays || 2;
        
        // Calculate midpoint in hours (e.g., if 2 days, midpoint is after 24 hours)
        const midpointHours = (ackWindowDays * 24) / 2;
        const reminderThresholdAt = addHours(new Date(log.releasedAt), midpointHours);

        // 2. Check if we have passed the midpoint
        if (isAfter(new Date(), reminderThresholdAt)) {
          this.logger.log(`Midpoint reached for Coaching Log ${log.id} (Agent: ${agent.name}). Sending reminder...`);

          try {
            await this.mailService.sendPendingCoachingReminder({
              to: agent.email,
              agentName: agent.name,
            });

            // 3. Update the reminderSent flag to true
            await this.prisma.coachingLog.update({
              where: { id: log.id },
              data: { reminderSent: true } as any,
            });

            sentCount++;
          } catch (mailError) {
            this.logger.error(`Failed to send reminder for Coaching Log ${log.id}:`, mailError);
          }
        }
      }

      this.logger.log(`Reminder check completed. Sent ${sentCount} reminders.`);
    } catch (error) {
      this.logger.error('Error during automated reminder process:', error);
    }
  }
}
