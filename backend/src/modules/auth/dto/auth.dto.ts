import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

/** Строка без пробелов по краям; не строка остаётся как есть — её отклонит `IsString`. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ---- Запросы ----

/** Запрос кода входа на почту. */
export class StartEmailLoginDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'anna@example.com' })
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;
}

/** Проверка кода из письма. */
export class VerifyEmailLoginDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'anna@example.com' })
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @ApiProperty({ pattern: '^[0-9]{6}$', example: '042917', description: 'Код из письма' })
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

// ---- Ответы ----

/** Тарифы аккаунта (решение №68). */
export const PLANS = ['free', 'plus', 'unlimited'] as const;
export type PlanValue = (typeof PLANS)[number];

/** Код отправлен. */
export class StartedLoginDto {
  @ApiProperty({ example: 600, description: 'Через сколько секунд код перестанет действовать' })
  expiresInSeconds!: number;
}

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
