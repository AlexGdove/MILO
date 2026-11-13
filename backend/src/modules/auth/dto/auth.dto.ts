import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '../password.js';

/** Строка без пробелов по краям; не строка остаётся как есть — её отклонит `IsString`. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ---- Запросы ----

/** Почта (повторный код, «забыли пароль»); основа остальных запросов. */
export class EmailDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'anna@example.com' })
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}

/** Регистрация: почта и пароль (пробелы значимы — не обрезаются; только латиница — PASSWORD_PATTERN). */
export class RegisterDto extends EmailDto {
  @ApiProperty({
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    example: 'correct horse battery',
  })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  @Matches(/\S/, { message: 'password must not be blank' })
  @Matches(PASSWORD_PATTERN, {
    message: 'password must contain only latin letters, digits and symbols',
  })
  password!: string;
}

/** Вход: без минимальной длины пароля — правила могут меняться, старые пароли не отсекаем. */
export class LoginDto extends EmailDto {
  @ApiProperty({ minLength: 1, maxLength: PASSWORD_MAX_LENGTH, format: 'password' })
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

/** Подтверждение почты кодом из письма. */
export class VerifyEmailDto extends EmailDto {
  @ApiProperty({ pattern: '^[0-9]{6}$', example: '042917', description: 'Код из письма' })
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

/** Сброс пароля: код из письма и новый пароль. */
export class ResetPasswordDto extends VerifyEmailDto {
  @ApiProperty({
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    example: 'correct horse battery',
  })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  @Matches(/\S/, { message: 'password must not be blank' })
  @Matches(PASSWORD_PATTERN, {
    message: 'password must contain only latin letters, digits and symbols',
  })
  password!: string;
}

/** Код отправлен (или ответ, неотличимый от отправки). */
export class CodeSentDto {
  @ApiProperty({ example: 600, description: 'Через сколько секунд код перестанет действовать' })
  expiresInSeconds!: number;
}

// ---- Ответы ----

/** Тарифы аккаунта (решение №68). */
export const PLANS = ['free', 'plus', 'unlimited'] as const;
export type PlanValue = (typeof PLANS)[number];

/** Аккаунт: только почта и тариф — личные данные остаются на устройстве (№60). */
export class AccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: PLANS, description: 'Тариф: бесплатный / платный с лимитом / безлимитный' })
  plan!: PlanValue;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'До какого момента оплачен тариф; null — бессрочно или free',
  })
  planUntil!: string | null;
}

/** Сессия после входа. */
export class SessionDto {
  @ApiProperty({
    pattern: '^ms_[A-Za-z0-9_-]{43}$',
    description: 'Токен сессии для заголовка Authorization: Bearer. Показывается один раз',
  })
  token!: string;

  @ApiProperty({ type: AccountDto })
  account!: AccountDto;
}
