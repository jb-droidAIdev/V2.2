
const { PrismaClient } = require('@prisma/client');

async function testOldDb() {
  const oldUrl = "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19qZkFOWXpCd2RXNDI4M1Y3clFCQ1UiLCJhcGlfa2V5IjoiMDFLSkZLQTNFV0pRV0RFM1Y2QTVWWlZDWU4iLCJ0ZW5hbnRfaWQiOiJlZTc4OTY2MWU2MmFkYmFhMzVkOTE5YTcxYjUzNjgxN2ZmZDhkN2QzNzhlYzcyMzI4MWRkZTI0YzcyOTk3MDJmIiwiaW50ZXJuYWxfc2VjcmV0IjoiMGUyYjRhMDktYzNlMS00MmQ0LWFiMjgtNDk5ZDYwMmMxNDg1In0.yKha3ne5vtMWUzCK6pDTFt2cYpcfJkSbIuka0L3onHA";
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: oldUrl,
      },
    },
  });

  try {
    console.log('Testing connection to OLD database...');
    const count = await prisma.user.count();
    console.log('OLD Database is accessible. User count:', count);
  } catch (error) {
    console.error('OLD Database is still BLOCKED or inaccessible:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOldDb();
