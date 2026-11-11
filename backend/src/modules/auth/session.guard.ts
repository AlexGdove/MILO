import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { AuthService, type SessionIdentity } from './auth.service.js';
import { AppException } from '../../common/errors/app.exception.js';

interface RequestWithSession {
  headers: Record<string, string | string[] | undefined>;
  session?: SessionIdentity;
}

const BEARER = /^Bearer (\S+)$/;

/**
 * Требует `Authorization: Bearer <токен сессии>`: нет заголовка — `401 session_required`;
 * неверный, истёкший, отозванный токен или заблокированный аккаунт — `401 session_invalid`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const header = request.headers.authorization;
    if (header === undefined || header === '') {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'session_required', 'Sign-in is required');
    }
    const token = typeof header === 'string' ? BEARER.exec(header)?.[1] : undefined;
    const session = token ? await this.auth.resolveSession(token) : null;
    if (!session) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'session_invalid', 'Session is invalid');
    }
    request.session = session;
    return true;
  }
}

/** Сессия, проверенная `SessionGuard`. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionIdentity => {
    const session = context.switchToHttp().getRequest<RequestWithSession>().session;
    if (!session) {
      // Ошибка программиста: декоратор без guard на маршруте
      throw new Error('CurrentSession used without SessionGuard');
    }
    return session;
  },
);
