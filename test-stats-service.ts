import { PrismaClient } from '@prisma/client';
import { DashboardService } from './src/modules/dashboard/dashboard.service';
import { PrismaService } from './src/prisma.service';

const prisma = new PrismaService();
const service = new DashboardService(prisma);

async function main() {
    try {
        const filters = {};
        const user = { id: 'test-id', role: 'ADMIN', employeeTeam: 'Test' };

        console.log("Calling getStats...");
        const stats = await service.getStats(filters, user);
        console.log("Stats returned:", Object.keys(stats));
    } catch (e) {
        console.error("Caught error:", e.message);
        console.error(e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
