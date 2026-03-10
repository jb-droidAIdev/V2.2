import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';

async function main() {
    const prisma = new PrismaClient();
    // We cast to any because DashboardService expects PrismaService which has additional methods,
    // but for getStats it only needs the standard client methods.
    const service = new DashboardService(prisma as any);

    const user = { id: '2451cdde-bcf1-4fe6-94fa-1a4daec2c02c', role: 'OPS_TL', permissions: ['AUDIT_VIEW_ALL'] };
    const filters = { startDate: '2026-03-01', endDate: '2026-03-10' };

    console.log('Fetching stats...');
    try {
        const stats = await service.getStats(filters, user);
        console.log('SUCCESS: Active Progressions Count:', stats.activeProgressions?.length);
    } catch (err: any) {
        console.error('FAILED: getStats threw an error:');
        console.error(err);
        if (err.stack) console.error(err.stack);
    }

    await prisma.$disconnect();
}

main();
