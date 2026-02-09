"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: 'admin', mode: 'insensitive' } },
                { name: { contains: 'admin', mode: 'insensitive' } }
            ]
        },
        select: { id: true, email: true, name: true, role: true, isActive: true }
    });
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=search_admin.js.map