const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const qaRole = await prisma.userRole.findUnique({
      where: { name: 'QA' },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
    
    if (qaRole) {
      console.log('--- QA ROLE PERMISSIONS ---');
      qaRole.permissions.forEach(p => {
        console.log(`Code: ${p.permission.code}`);
      });
      console.log('---------------------------');
    } else {
      console.log('QA Role not found');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
