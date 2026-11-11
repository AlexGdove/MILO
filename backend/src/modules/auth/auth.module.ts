import { Module } from '@nestjs/common';

import { AccountController, AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailSender, LogEmailSender } from './email-sender.js';
import { SessionGuard } from './session.guard.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/**
 * Аккаунты (решения №60, №68): вход по коду на почту, сессии, тариф. Отправка писем —
 * за `EmailSender`; сейчас есть только `log` (разработка), почтовый сервис ещё не выбран.
 */
@Module({
  imports: [RateLimitModule],
  controllers: [AuthController, AccountController],
  providers: [AuthService, SessionGuard, { provide: EmailSender, useClass: LogEmailSender }],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
