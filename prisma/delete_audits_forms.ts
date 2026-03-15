import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Deleting Audits and Forms...');

    try {
        // Delete related data first to avoid foreign key constraint errors
        await prisma.auditScore.deleteMany({});
        console.log('Deleted all AuditScores');

        // Note: Replace with actual related models if they exist (CoachingLog, Dispute, etc.)
        // Ignore if models don't exist by catching individual errors, but standard Prisma deleteMany is fine
        try {
            // @ts-ignore
            await prisma.coachingLog.deleteMany({});
            console.log('Deleted all CoachingLogs');
        } catch (e) { }

        try {
            // @ts-ignore
            await prisma.dispute.deleteMany({});
            console.log('Deleted all Disputes');
        } catch (e) { }

        // Delete main Audit records
        await prisma.audit.deleteMany({});
        console.log('Deleted all Audits');

        // Delete Form related data
        await prisma.formCriterion.deleteMany({});
        console.log('Deleted all FormCriteria');

        await prisma.monitoringFormVersion.deleteMany({});
        console.log('Deleted all MonitoringFormVersions');

        await prisma.monitoringForm.deleteMany({});
        console.log('Deleted all MonitoringForms');

        console.log('✅ Successfully deleted all audits and forms.');
    } catch (error) {
        console.error('❌ Error during deletion:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
