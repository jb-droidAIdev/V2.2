import { PrismaClient, AuditStatus, Role } from '@prisma/client';

async function test() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found to test with.');
      return;
    }

    console.log('Testing with user:', user.email, 'Role:', user.role);

    // Test getFilterOptions logic (manually simulated)
    const managersRaw = await prisma.user.findMany({
      where: {
        manager: { not: null },
      },
      select: { manager: true },
      distinct: ['manager'],
    });
    console.log('Managers found:', managersRaw.length);

    // Test getStats query logic
    const audit = await prisma.audit.findFirst({
      where: {
        status: { in: [AuditStatus.SUBMITTED, AuditStatus.RELEASED] },
        agent: {
          manager: { in: ['Some Manager'] }
        }
      }
    });
    console.log('Audit query test successful');

  } catch (error) {
    console.error('TEST FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
