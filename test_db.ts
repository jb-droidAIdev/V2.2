import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const auditId = '20e713e1-7561-4780-affd-da0e338fb1ea';
    const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        include: {
            formVersion: { include: { criteria: true } },
            scores: { include: { criterion: true } },
        }
    });

    if (!audit) {
        console.log('Audit not found');
        return;
    }

    console.log(`\nAudit: ${audit.id}`);
    console.log(`Form Version: ${audit.formVersionId}`);
    console.log(`Criteria in Version (${audit.formVersion.criteria.length}):`);
    audit.formVersion.criteria.forEach(c => {
        console.log(`  - [${c.id}] ${c.title} (Critical: ${c.isCritical}, Weight: ${c.weight})`);
    });

    console.log(`\nScores in DB (${audit.scores.length}):`);
    audit.scores.forEach(s => {
        const isRelevant = audit.formVersion.criteria.some(c => c.id === s.criterionId);
        console.log(`  - [${s.criterionId}] Title: ${s.criterionTitle || s.criterion.title} | Score: ${s.score} | Failed: ${s.isFailed} | Relevant: ${isRelevant}`);
        console.log(`    Comment: "${s.comment}" (${s.comment?.length || 0} chars)`);
    });

    const validIds = new Set(audit.formVersion.criteria.map(c => c.id));
    const relevantScores = audit.scores.filter(s => validIds.has(s.criterionId));

    const failedWithoutRemarks = relevantScores.filter(s => {
        const validComment = s.comment && s.comment.trim().length >= 10;
        return s.isFailed && !validComment;
    });

    if (failedWithoutRemarks.length > 0) {
        console.log('\n!!! VALIDATION FAILURE !!!');
        failedWithoutRemarks.forEach(s => {
            console.log(`Item "${s.criterion.title}" is marked as failed but comment is too short: "${s.comment}"`);
        });
    } else {
        console.log('\nNo validation errors found for mandatory remarks.');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
