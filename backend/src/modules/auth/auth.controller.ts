import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import type { SessionIdentity } from './auth.service.js';
import {
  AccountDto,
  SessionDto,
  StartedLoginDto,
  StartEmailLoginDto,
  VerifyEmailLoginDto,
} from './dto/auth.dto.js';
import { CurrentSession, SessionGuard } from './session.guard.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

const UNAVAILABLE = { type: ErrorResponseDto, description: 'code: auth_unavailable' } as const;
const LIMITED = { type: ErrorResponseDto, description: 'code: rate_limited' } as const;
const NO_SESSION = {
  type: ErrorResponseDto,
  description: 'code: session_required | session_invalid',
} as const;

/** Вход по коду на почту (решения №60, №68). Аккаунт нужен только для тарифа. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('email/start')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('authStart')
  @ApiOperation({
    summary: 'Отправить код входа на почту',
    description: 'Ответ одинаковый для новой и существующей почты; прежний код гаснет',
  })
  @ApiAcceptedResponse({ type: StartedLoginDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'code: validation_failed' })
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  start(@Body() dto: StartEmailLoginDto): Promise<StartedLoginDto> {
    return this.auth.startEmailLogin(dto.email);
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit('authVerify')
  @ApiOperation({ summary: 'Проверить код → токен сессии (при первом входе создаётся аккаунт)' })
  @ApiOkResponse({ type: SessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'code: login_code_invalid' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'code: account_blocked' })
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  verify(@Body() dto: VerifyEmailLoginDto): Promise<SessionDto> {
    return this.auth.verifyEmailLogin(dto.email, dto.code);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @RateLimit('account')
  @ApiBearerAuth('session')
  @ApiOperation({ summary: 'Выйти: текущая сессия закрывается' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse(NO_SESSION)
  async logout(@CurrentSession() session: SessionIdentity): Promise<void> {
    await this.auth.logout(session.sessionId);
  }
}

@ApiTags('account')
@ApiBearerAuth('session')
@Controller('account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @RateLimit('account')
  @ApiOperation({ summary: 'Свой аккаунт: почта и тариф' })
  @ApiOkResponse({ type: AccountDto })
  @ApiUnauthorizedResponse(NO_SESSION)
  me(@CurrentSession() session: SessionIdentity): Promise<AccountDto> {
    return this.auth.getAccount(session.accountId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit('account')
  @ApiOperation({ summary: 'Удалить аккаунт, все сессии и коды входа' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse(NO_SESSION)
  async remove(@CurrentSession() session: SessionIdentity): Promise<void> {
    await this.auth.deleteAccount(session.accountId);
  }
}
