import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getAuthConfig } from './auth.config.js';
import { AccountController, AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailSender, LogEmailSender, SmtpEmailSender } from './email-sender.js';
import { SessionGuard } from './session.guard.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/**
 * Аккаунты (решения №60, №68, №69): регистрация почтой и паролем, коды из письма, сессии, тариф.
 * Письма — `EmailSender` по `EMAIL_TRANSPORT`: `smtp` — свой почтовый сервер (№70), иначе лог.
 */
@Module({
  imports: [RateLimitModule],
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    SessionGuard,
    {
      provide: EmailSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailSender => {
        const { smtp } = getAuthConfig(config);
        return smtp ? new SmtpEmailSender(smtp) : new LogEmailSender();
      },
    },
  ],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
