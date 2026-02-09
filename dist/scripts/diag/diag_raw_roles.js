"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const roles = await prisma.$queryRaw `SELECT role, count(*) FROM "User" GROUP BY role`;
        console.log('Database Role Distribution:', roles);
        const samples = await prisma.user.findMany({
            take: 5,
            select: { id: true, name: true, role: true }
        });
        console.log('Sample Users:', samples);
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=diag_raw_roles.js.map