const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
    const firstUser = await prisma.user.findFirst({ select: { email: true } });
    console.log('First user:', firstUser?.email);
    console.log('DB Success');
  } catch (e) {
    console.error('DB Connection Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
