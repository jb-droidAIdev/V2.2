const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Searching for "Customer" in FormCriterion...');
    const criteria = await prisma.formCriterion.findMany({
        where: {
            OR: [
                { categoryName: { contains: 'Customer', mode: 'insensitive' } },
                { title: { contains: 'Customer', mode: 'insensitive' } },
                { isCritical: true }
            ]
        },
        take: 10
    });

    if (criteria.length === 0) {
        console.log('No criteria found with "Customer" or marked as Critical.');
    } else {
        criteria.forEach(c => {
            console.log(`- ID: ${c.id}, Category: "${c.categoryName}", Title: "${c.title}", isCritical: ${c.isCritical}`);
        });
    }

    console.log('\nSearching for AuditScores marked as Failed or low score...');
    const failedScores = await prisma.auditScore.findMany({
        where: {
            isFailed: true
        },
        take: 5,
        include: {
            criterion: true
        }
    });

    console.log(`Found ${failedScores.length} explicit failed scores.`);
    failedScores.forEach(fs => {
        console.log(`- [Markdown] Score ID: ${fs.id}, Criterion: "${fs.criterion.title}" (Category: ${fs.criterion.categoryName}), isFailed: ${fs.isFailed}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
