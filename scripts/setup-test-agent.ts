import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'agent_test@example.com';
    const plainPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    console.log(`Setting up test agent: ${email}`);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            isActive: true,
            role: 'AGENT',
            mustChangePassword: false,
        },
        create: {
            email,
            name: 'Test Agent',
            password: hashedPassword,
            role: 'AGENT',
            isActive: true,
            mustChangePassword: false,
            eid: 'AGT_TEST_001',
            systemId: 'SYS_AGT_001'
        },
    });

    console.log(`✅ Success!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
