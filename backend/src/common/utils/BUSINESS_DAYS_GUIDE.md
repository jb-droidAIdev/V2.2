# Business Days Utility - Usage Guide

## Overview
This utility provides business days calculation for SLA tracking in the QA workflow.

**Business Days Rule**: Monday to Friday in EST timezone (America/New_York)

## Installation
```bash
npm install luxon
npm install --save-dev @types/luxon
```

## Core Functions

### 1. `isBusinessDay(date)`
Check if a date is a business day (Monday-Friday in EST).

```typescript
import { isBusinessDay } from '@/common/utils/business-days.util';

const monday = new Date('2025-01-06');
console.log(isBusinessDay(monday)); // true

const saturday = new Date('2025-01-11');
console.log(isBusinessDay(saturday)); // false
```

### 2. `addBusinessDays(startDate, businessDays)`
Add X business days to a date (skips weekends).

```typescript
import { addBusinessDays } from '@/common/utils/business-days.util';

// Release audit on Monday
const releaseDate = new Date('2025-01-06');

// Agent has 3 business days to respond
const agentDeadline = addBusinessDays(releaseDate, 3);
console.log(agentDeadline.toISODate()); // '2025-01-09' (Thursday)
```

### 3. `getBusinessDaysBetween(startDate, endDate)`
Calculate number of business days between two dates.

```typescript
import { getBusinessDaysBetween } from '@/common/utils/business-days.util';

const start = new Date('2025-01-06'); // Monday
const end = new Date('2025-01-10');   // Friday

const days = getBusinessDaysBetween(start, end);
console.log(days); // 5 business days
```

### 4. `getBusinessDayDeadline(startDate, businessDays)`
Get deadline date at 5 PM EST (end of business day).

```typescript
import { getBusinessDayDeadline } from '@/common/utils/business-days.util';

const releaseDate = new Date('2025-01-06T09:00:00');
const deadline = getBusinessDayDeadline(releaseDate, 3);

console.log(deadline.toISO()); // '2025-01-09T17:00:00.000-05:00' (Thu 5 PM EST)
```

### 5. `isDeadlinePassed(deadline)`
Check if current time is past the deadline.

```typescript
import { isDeadlinePassed, getBusinessDayDeadline } from '@/common/utils/business-days.util';

const deadline = getBusinessDayDeadline(new Date(), 3);

if (isDeadlinePassed(deadline)) {
    console.log('SLA breached!');
} else {
    console.log('Still within SLA');
}
```

### 6. `getRemainingBusinessDays(deadline)`
Get remaining business days until deadline (returns 0 if passed).

```typescript
import { getRemainingBusinessDays, getBusinessDayDeadline } from '@/common/utils/business-days.util';

const deadline = getBusinessDayDeadline(new Date(), 3);
const remaining = getRemainingBusinessDays(deadline);

console.log(`${remaining} business days remaining`);
```

### 7. `getNowEST()` and `toEST(date)`
Get current time or convert any date to EST timezone.

```typescript
import { getNowEST, toEST } from '@/common/utils/business-days.util';

const now = getNowEST();
console.log(now.toISO()); // Current time in EST

const utcDate = new Date();
const estDate = toEST(utcDate);
console.log(estDate.toISO()); // Converted to EST
```

## Real-World SLA Scenarios

### Agent Acknowledge/Dispute Window (3 Business Days)
```typescript
import { getBusinessDayDeadline, getRemainingBusinessDays } from '@/common/utils/business-days.util';

// When audit is released
const releaseDate = new Date();
const agentDeadline = getBusinessDayDeadline(releaseDate, 3);

// Store in database
await prisma.audit.update({
    where: { id: auditId },
    data: {
        releasedAt: releaseDate,
        agentDeadline: agentDeadline.toJSDate()
    }
});

// Check remaining time
const remaining = getRemainingBusinessDays(agentDeadline);
console.log(`Agent has ${remaining} business days to respond`);
```

### TL Sign-off (1 Business Day, 4th Business Day Total)
```typescript
import { getBusinessDayDeadline } from '@/common/utils/business-days.util';

// When agent window closes (deemed acknowledged)
const releaseDate = audit.releasedAt;
const tlDeadline = getBusinessDayDeadline(releaseDate, 4); // 3 + 1

await prisma.audit.update({
    where: { id: auditId },
    data: {
        status: 'DEEMED_ACKNOWLEDGED_PENDING_TL',
        tlDeadline: tlDeadline.toJSDate()
    }
});
```

### Dispute Resolution SLA (1 Business Day)
```typescript
import { getBusinessDayDeadline, isDeadlinePassed } from '@/common/utils/business-days.util';

// When dispute is submitted
const disputeDate = new Date();
const opsTlDeadline = getBusinessDayDeadline(disputeDate, 1);

await prisma.dispute.create({
    data: {
        auditId,
        submittedAt: disputeDate,
        opsTlDeadline: opsTlDeadline.toJSDate(),
        status: 'PENDING_TL_REVIEW'
    }
});

// Check if SLA breached
if (isDeadlinePassed(dispute.opsTlDeadline)) {
    // Send escalation notification
    await sendEscalationEmail({
        to: ['qa-manager@company.com', 'am@company.com'],
        subject: 'Dispute SLA Breached',
        disputeId: dispute.id
    });
}
```

### Calibration Session Reminders
```typescript
import { getBusinessDaysBetween, getRemainingBusinessDays } from '@/common/utils/business-days.util';

// When calibration session is scheduled
const sessionDate = new Date('2025-01-15');
const scoringDeadline = getBusinessDayDeadline(sessionDate, -1); // 1 day before

// Check if reminder should be sent (24 hours before SLA)
const remaining = getRemainingBusinessDays(scoringDeadline);

if (remaining === 1) {
    // Send reminder to all raters
    await sendCalibrationReminder({
        sessionId,
        message: 'Calibration scoring due tomorrow at 5 PM EST'
    });
}
```

## Database Integration Example

### Add Deadline Fields to Audit Model
```prisma
model Audit {
  id              String   @id @default(uuid())
  // ... other fields
  
  releasedAt      DateTime?
  agentDeadline   DateTime?  // 3 business days from release
  tlDeadline      DateTime?  // 4 business days from release
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Dispute {
  id              String   @id @default(uuid())
  // ... other fields
  
  submittedAt     DateTime
  opsTlDeadline   DateTime  // 1 business day from submission
  qaTlDeadline    DateTime? // 1 business day from escalation
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Service Layer Example
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { getBusinessDayDeadline, isDeadlinePassed } from '@/common/utils/business-days.util';

@Injectable()
export class ReleaseService {
    constructor(private prisma: PrismaService) {}
    
    async releaseAudit(auditId: string) {
        const now = new Date();
        const agentDeadline = getBusinessDayDeadline(now, 3);
        const tlDeadline = getBusinessDayDeadline(now, 4);
        
        await this.prisma.audit.update({
            where: { id: auditId },
            data: {
                status: 'RELEASED',
                releasedAt: now,
                agentDeadline: agentDeadline.toJSDate(),
                tlDeadline: tlDeadline.toJSDate()
            }
        });
        
        // Send notifications
        await this.sendReleaseNotifications(auditId);
    }
    
    async checkOverdueAudits() {
        const audits = await this.prisma.audit.findMany({
            where: {
                status: 'RELEASED',
                agentDeadline: { not: null }
            }
        });
        
        for (const audit of audits) {
            if (isDeadlinePassed(audit.agentDeadline)) {
                // Auto-transition to deemed acknowledged
                await this.deemedAcknowledge(audit.id);
            }
        }
    }
}
```

## Cron Job for SLA Monitoring
```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isDeadlinePassed } from '@/common/utils/business-days.util';

@Injectable()
export class SlaMonitorService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService
    ) {}
    
    // Run every hour during business hours (9 AM - 6 PM EST)
    @Cron('0 9-18 * * 1-5', { timeZone: 'America/New_York' })
    async checkSlaBreaches() {
        // Check agent deadlines
        const overdueAudits = await this.prisma.audit.findMany({
            where: {
                status: 'RELEASED',
                agentDeadline: { lte: new Date() }
            }
        });
        
        for (const audit of overdueAudits) {
            await this.handleAgentWindowExpired(audit.id);
        }
        
        // Check dispute deadlines
        const overdueDisputes = await this.prisma.dispute.findMany({
            where: {
                status: 'PENDING_TL_REVIEW',
                opsTlDeadline: { lte: new Date() }
            }
        });
        
        for (const dispute of overdueDisputes) {
            await this.escalateDisputeSla(dispute.id);
        }
    }
}
```

## Testing
Run the test suite:
```bash
npm test business-days.util.spec.ts
```

## Notes
- All calculations use **EST timezone** (America/New_York)
- Weekends (Saturday/Sunday) are automatically excluded
- Holidays are NOT currently excluded (Phase 2 enhancement)
- Deadlines are set to **5 PM EST** (end of business day)
- All dates are timezone-aware using Luxon library
