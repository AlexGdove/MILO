import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { PageQueryDto } from '../../../common/pagination/page.js';
import type { AutomodFlag } from '../automod.js';
import { isValidBarcode } from '../barcode.js';

// Ограничения совпадают с CHECK в базе (миграция products_instead_of_public_recipes) и с
// продуктом кладовой во frontend: DTO отсекает неверные данные раньше базы (там это 500).

export const UNITS = ['g', 'ml', 'pcs'] as const;
export type UnitValue = (typeof UNITS)[number];

const DECIMALS = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };

/** Строка без пробелов по краям; не строка остаётся как есть — её отклонит `IsString`. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Пустая строка в необязательном поле = поле не задано. */
const trimToUndefined = ({ value }: { value: unknown }) => {
  const trimmed = trim({ value });
  return trimmed === '' || trimmed === null ? undefined : trimmed;
};

@ValidatorConstraint({ name: 'macrosSum' })
class MacrosSumConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { protein, fat, carbs } = args.object as NutrientsDto;
    if (![protein, fat, carbs].every((n) => typeof n === 'number')) return true;
    return protein + fat + carbs <= 100;
  }

  defaultMessage(): string {
    return 'protein + fat + carbs per 100 g must not exceed 100';
  }
}

@ValidatorConstraint({ name: 'pieceWeightOnlyForPieces' })
class PieceWeightOnlyForPiecesConstraint implements ValidatorConstraintInterface {
  validate(unit: unknown, args: ValidationArguments): boolean {
    const { pieceWeight } = args.object as { pieceWeight?: unknown };
    return unit === 'pcs' || pieceWeight === undefined || pieceWeight === null;
  }

  defaultMessage(): string {
    return 'pieceWeight must be null unless unit is pcs';
  }
}

@ValidatorConstraint({ name: 'barcodeChecksum' })
class BarcodeChecksumConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidBarcode(value);
  }

  defaultMessage(): string {
    return 'barcode check digit is invalid';
  }
}

/** КБЖУ на 100 г. */
export class NutrientsDto {
  @ApiProperty({ minimum: 0, maximum: 900, example: 343 })
  @IsNumber(DECIMALS)
  @Min(0)
  @Max(900)
  kcal!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 12.6 })
  @IsNumber(DECIMALS)
  @Min(0)
  @Max(100)
  protein!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 3.3 })
  @IsNumber(DECIMALS)
  @Min(0)
  @Max(100)
  fat!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 62.1, description: 'Б + Ж + У ≤ 100' })
  @IsNumber(DECIMALS)
  @Min(0)
  @Max(100)
  @Validate(MacrosSumConstraint)
  carbs!: number;
}

/** Предложение продукта в общую базу (B-18). */
export class SubmitProductDto {
  @ApiProperty({ minLength: 1, maxLength: 120, example: 'Гречка ядрица' })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Мистраль' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @ApiPropertyOptional({
    description: 'EAN-8 / UPC-A / EAN-13 / GTIN-14, с верной контрольной цифрой',
    example: '4600682000013',
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^(\d{8}|\d{12,14})$/, { message: 'barcode must be 8, 12, 13 or 14 digits' })
  @Validate(BarcodeChecksumConstraint)
  barcode?: string;

  @ApiProperty({ enum: UNITS, example: 'g' })
  @IsIn(UNITS)
  @Validate(PieceWeightOnlyForPiecesConstraint)
  unit!: UnitValue;

  @ApiProperty({
    type: Number,
    nullable: true,
    maximum: 5000,
    description: 'Вес одной штуки, г: обязателен при pcs, иначе null',
    example: null,
  })
  @ValidateIf((o: SubmitProductDto) => o.unit === 'pcs')
  @IsNumber(DECIMALS)
  @IsPositive()
  @Max(5000)
  pieceWeight!: number | null;

  @ApiProperty({ type: NutrientsDto })
  @ValidateNested()
  @Type(() => NutrientsDto)
  per100g!: NutrientsDto;
}

export { PageQueryDto };

export class ProductQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 60, description: 'Поиск по названию и бренду' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  q?: string;

  @ApiPropertyOptional({ description: 'Точный штрихкод (для сканера)' })
  @IsOptional()
  @Matches(/^(\d{8}|\d{12,14})$/, { message: 'barcode must be 8, 12, 13 or 14 digits' })
  barcode?: string;
}

// ---- Ответы ----

export class ProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  brand!: string | null;

  @ApiProperty({ type: String, nullable: true })
  barcode!: string | null;

  @ApiProperty({ enum: UNITS })
  unit!: UnitValue;

  @ApiProperty({ type: Number, nullable: true })
  pieceWeight!: number | null;

  @ApiProperty({ type: NutrientsDto })
  per100g!: NutrientsDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ProductPageDto {
  @ApiProperty({ type: [ProductDto] })
  items!: ProductDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class SubmissionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: ['pending', 'approved', 'rejected'],
    description: 'pending — ждёт человека; approved — в общей базе; rejected — отклонено',
  })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiProperty({
    type: [String],
    description: 'Замечания автомодерации (коды), например energy_mismatch',
    example: [],
  })
  flags!: AutomodFlag[];

  @ApiProperty({ enum: ['auto', 'operator'], nullable: true })
  reviewedBy!: 'auto' | 'operator' | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Продукт общей базы' })
  productId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  brand!: string | null;

  @ApiProperty({ type: String, nullable: true })
  barcode!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class SubmissionPageDto {
  @ApiProperty({ type: [SubmissionDto] })
  items!: SubmissionDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
