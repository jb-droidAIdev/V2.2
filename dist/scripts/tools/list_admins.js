"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, name: true, role: true, isActive: true, lockoutUntil: true }
    });
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=list_admins.js.map