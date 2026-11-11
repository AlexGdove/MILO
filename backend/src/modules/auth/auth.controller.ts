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
  ApiConflictResponse,
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
  CodeSentDto,
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SessionDto,
  VerifyEmailDto,
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

const INVALID_CODE = { type: ErrorResponseDto, description: 'code: code_invalid' } as const;
const BLOCKED = { type: ErrorResponseDto, description: 'code: account_blocked' } as const;
const VALIDATION = { type: ErrorResponseDto, description: 'code: validation_failed' } as const;

/**
 * Аккаунты (решения №60, №68, №69): регистрация почтой и паролем, подтверждение почты кодом,
 * вход паролем, сброс пароля кодом. Аккаунт нужен только для тарифа.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('authRegister')
  @ApiOperation({
    summary: 'Регистрация: аккаунт без подтверждения и код на почту',
    description: 'Повтор для неподтверждённой почты меняет пароль и шлёт новый код',
  })
  @ApiAcceptedResponse({ type: CodeSentDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'code: email_taken' })
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  register(@Body() dto: RegisterDto): Promise<CodeSentDto> {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('register/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('authEmail')
  @ApiOperation({ summary: 'Повторить код подтверждения (ответ одинаковый для любой почты)' })
  @ApiAcceptedResponse({ type: CodeSentDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  resend(@Body() dto: EmailDto): Promise<CodeSentDto> {
    return this.auth.resendVerification(dto.email);
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit('authCode')
  @ApiOperation({ summary: 'Подтвердить почту кодом → токен сессии' })
  @ApiOkResponse({ type: SessionDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiUnauthorizedResponse(INVALID_CODE)
  @ApiForbiddenResponse(BLOCKED)
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  verify(@Body() dto: VerifyEmailDto): Promise<SessionDto> {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit('authLogin')
  @ApiOperation({ summary: 'Вход почтой и паролем → токен сессии' })
  @ApiOkResponse({ type: SessionDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'code: invalid_credentials' })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'code: email_not_verified | account_blocked',
  })
  @ApiTooManyRequestsResponse(LIMITED)
  login(@Body() dto: LoginDto): Promise<SessionDto> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('authEmail')
  @ApiOperation({
    summary: 'Забыли пароль: код сброса на почту (ответ одинаковый для любой почты)',
  })
  @ApiAcceptedResponse({ type: CodeSentDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  forgot(@Body() dto: EmailDto): Promise<CodeSentDto> {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @RateLimit('authCode')
  @ApiOperation({ summary: 'Новый пароль по коду: прежние сессии закрываются → новый токен' })
  @ApiOkResponse({ type: SessionDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiUnauthorizedResponse(INVALID_CODE)
  @ApiForbiddenResponse(BLOCKED)
  @ApiTooManyRequestsResponse(LIMITED)
  @ApiServiceUnavailableResponse(UNAVAILABLE)
  reset(@Body() dto: ResetPasswordDto): Promise<SessionDto> {
    return this.auth.resetPassword(dto.email, dto.code, dto.password);
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
