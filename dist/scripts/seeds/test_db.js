"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Testing connection...');
    try {
        const count = await prisma.user.count();
        console.log(`Connection successful. User count: ${count}`);
    }
    catch (e) {
        console.error('Connection failed:', e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test_db.js.map