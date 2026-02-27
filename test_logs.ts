import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const audits = await prisma.audit.findMany({
        where: { status: 'IN_PROGRESS' },
        orderBy: { lastActionAt: 'desc' },
        take: 5,
        include: {
            formVersion: { include: { criteria: true } },
            scores: { include: { criterion: true } },
        }
    });

    for (let audit of audits) {
        console.log('---');
        console.log(`Audit ID: ${audit.id}`);
        console.log(`Updated At: ${audit.lastActionAt}`);

        const validIds = new Set(audit.formVersion.criteria.map(c => c.id));
        const relevantScores = audit.scores.filter(s => validIds.has(s.criterionId));

        const scoredCriteriaIds = new Set(relevantScores.map(s => s.criterionId));
        console.log(`Criteria: ${audit.formVersion.criteria.length}, Relevant Scores: ${scoredCriteriaIds.size}`);

        if (scoredCriteriaIds.size !== audit.formVersion.criteria.length) {
            console.log(`> INCOMPLETE! Scored ${scoredCriteriaIds.size} of ${audit.formVersion.criteria.length}`);
        }

        const failedWithoutRemarks = relevantScores.filter((s) => {
            const hasValidComment = s.comment && s.comment.trim().length >= 10;
            return s.isFailed && !hasValidComment;
        });

        if (failedWithoutRemarks.length > 0) {
            console.log(`> REQUIRES REMARKS! Items: ${failedWithoutRemarks.map(s => s.criterion?.title || s.criterionId).join(', ')}`);
        }
    }
}
main().finally(() => prisma.$disconnect());
