"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const mail_service_1 = require("../../modules/mail/mail.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const mailService = app.get(mail_service_1.MailService);
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`--- Testing Email Service ---`);
    console.log(`Target: ${testEmail}`);
    try {
        await mailService.sendMail(testEmail, 'QMS System: Test Execution', `
      <h1>Connection Successful</h1>
      <p>This is a test email from the QMS Quality Management System.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
      `);
        console.log('✅ Test email sent successfully!');
    }
    catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error);
    }
    await app.close();
}
bootstrap();
//# sourceMappingURL=test-mail.js.map