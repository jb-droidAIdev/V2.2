import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MailService } from '../../modules/mail/mail.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);

    const testEmail = process.argv[2] || 'test@example.com';

    console.log(`--- Testing Email Service ---`);
    console.log(`Target: ${testEmail}`);

    try {
        await mailService.sendMail(
            testEmail,
            'QMS System: Test Execution',
            `
      <h1>Connection Successful</h1>
      <p>This is a test email from the QMS Quality Management System.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
      `
        );
        console.log('✅ Test email sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error);
    }

    await app.close();
}

bootstrap();
