import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export const ERROR_KINDS = ['error', 'unhandledrejection', 'render'] as const;
export const ERROR_PLATFORMS = ['web', 'android', 'ios'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Отчёт об ошибке из приложения. Только технические данные — личных данных и содержимого нет. */
export class ClientErrorDto {
  @ApiProperty({
    enum: ERROR_KINDS,
    description: 'ошибка кода / необработанный промис / ошибка отрисовки',
  })
  @IsIn(ERROR_KINDS)
  kind!: (typeof ERROR_KINDS)[number];

  @ApiProperty({ minLength: 1, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  message!: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @ApiProperty({ enum: ERROR_PLATFORMS })
  @IsIn(ERROR_PLATFORMS)
  platform!: (typeof ERROR_PLATFORMS)[number];

  @ApiProperty({ example: '1.1.2' })
  @IsString()
  @Matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  appVersion!: string;

  @ApiPropertyOptional({ maxLength: 200, description: 'путь страницы без параметров' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  route?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  userAgent?: string;
}
