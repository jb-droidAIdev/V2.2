"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    console.log('--- USER LIST ---');
    users.forEach(u => console.log(`${u.email} [${u.role}] (Locked: ${u.lockoutUntil})`));
    console.log('-----------------');
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=list_users.js.map