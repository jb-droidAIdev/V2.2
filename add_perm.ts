import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.permission.upsert({
      where: { code: 'AUDIT_IMPORT_LEGACY' },
      update: {},
      create: {
        code: 'AUDIT_IMPORT_LEGACY',
        module: 'Audit',
        description: 'Grants the ability to bulk import historical legacy audits from spreadsheets.'
      }
    });
    
    // Also grant it automatically to the predefined ADMIN role to be safe
    const adminRole = await prisma.userRole.findFirst({ where: { name: 'Admin' } });
    if (adminRole) {
        const perm = await prisma.permission.findUnique({ where: { code: 'AUDIT_IMPORT_LEGACY' }});
        if (perm) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: adminRole.id, permissionId: perm.id }
            });
        }
    }
    console.log('Permission setup complete');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
