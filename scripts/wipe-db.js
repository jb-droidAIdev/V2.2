const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting Database Wipe using deleteMany()...');

    const models = [
        'disputeItem',
        'dispute',
        'auditScore',
        'auditFieldValue',
        'auditEvent',
        'releaseRecord',
        'auditUserView',
        'calibrationScore',
        'calibrationParticipant',
        'calibrationTicket',
        'calibrationAnchor',
        'calibrationResult',
        'calibrationSession',
        'audit',
        'sampledTicket',
        'samplingRun',
        'uploadedTicket',
        'ticketUploadBatch',
        'campaignQA',
        'formCriterion',
        'monitoringFormVersion',
        'monitoringForm',
        'campaign',
        'notificationDeliveryAttempt',
        'notification',
        'userPermission',
        'rolePermission',
        'user',
        'permission',
        'userRole'
    ];

    for (const model of models) {
        try {
            if (prisma[model]) {
                const result = await prisma[model].deleteMany({});
                console.log(`✅ Cleared ${model} (${result.count} records)`);
            }
        } catch (e) {
            console.log(`❌ Error clearing ${model}: ${e.message}`);
        }
    }

    console.log('\n✨ Database wipe complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
