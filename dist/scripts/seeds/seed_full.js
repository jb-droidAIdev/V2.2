"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const usersToCreate = [
    { email: 'qa_tl@qms.local', name: 'QA Team Lead', role: client_1.Role.QA_TL },
    { email: 'qa@qms.local', name: 'QA Rater', role: client_1.Role.QA },
    { email: 'am@qms.local', name: 'Ops Manager', role: client_1.Role.OPS_MANAGER },
    { email: 'sdm@qms.local', name: 'Service Delivery Manager', role: client_1.Role.SDM },
    { email: 'agent@qms.local', name: 'Agent Smith', role: client_1.Role.AGENT }
];
async function main() {
    const hashedPassword = await bcrypt.hash('Standard123!', 10);
    for (const u of usersToCreate) {
        const exist = await prisma.user.findUnique({ where: { email: u.email } });
        if (!exist) {
            await prisma.user.create({
                data: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    password: hashedPassword,
                    failedLoginAttempts: 0,
                    mustChangePassword: false,
                }
            });
            console.log(`Created ${u.email}`);
        }
        else {
            console.log(`${u.email} already exists.`);
            await prisma.user.update({
                where: { id: exist.id },
                data: {
                    password: hashedPassword,
                    lockoutUntil: null,
                    failedLoginAttempts: 0
                }
            });
            console.log(`Updated password for ${u.email}`);
        }
    }
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=seed_full.js.map