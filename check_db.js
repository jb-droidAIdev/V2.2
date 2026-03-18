const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const rpCount = await prisma.rolePermission.count();
    console.log('RolePermission record count:', rpCount);
    
    const adminRole = await prisma.userRole.findUnique({
        where: { name: 'ADMIN' },
        include: { permissions: { include: { permission: true } } }
    });
    
    if (adminRole) {
        console.log('ADMIN Role found. Permissions:', adminRole.permissions.length);
        const codes = adminRole.permissions.map(p => p.permission.code);
        console.log('ADMIN Codes includes *: ', codes.includes('*'));
    } else {
        console.log('ADMIN Role NOT FOUND!');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
