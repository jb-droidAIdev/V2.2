import { Module } from '@nestjs/common';
import { MailService } from './mail.service'; // Service implementation

@Module({
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
