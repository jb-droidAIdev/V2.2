const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'qa@example.com' },
      include: {
        customPermissions: {
          include: { permission: true }
        }
      }
    });
    
    if (user) {
      console.log('--- QA USER CUSTOM PERMISSIONS ---');
      user.customPermissions.forEach(p => {
        console.log(`Code: ${p.permission.code}`);
      });
      console.log('-----------------------------------');
    } else {
      console.log('QA User not found');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
