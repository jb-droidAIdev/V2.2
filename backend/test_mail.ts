import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MailService } from './src/modules/mail/mail.service';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);

    const target = process.argv[2] || 'test@example.com';

    console.log('--- QMS Mail Module Test ---');
    console.log(`Sending to: ${target}`);

    try {
        await mailService.sendMail(
            target,
            'QMS Mail Test',
            '<h1>Mail Service Active</h1><p>The QMS email notification engine is now operational.</p>'
        );
        console.log('SUCCESS: Email sent.');
    } catch (e) {
        console.error('ERROR: Failed to send mail.');
        console.error(e);
    } finally {
        await app.close();
    }
}

main();
