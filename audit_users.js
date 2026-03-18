const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRole: true
      }
    });
    
    console.log('--- USER DATA AUDIT ---');
    users.forEach(u => {
      console.log(`User: ${u.email}`);
      console.log(`  Table Role Field: "${u.role}"`);
      console.log(`  Table RoleID Field: "${u.roleId}"`);
      console.log(`  Joined Role Name: "${u.userRole?.name || 'NONE'}"`);
      console.log('------------------------');
    });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
