import type { ValidationError } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

import { createValidationPipe, flattenValidationErrors } from './validation.pipe.js';
import { AppException } from '../errors/app.exception.js';

class IngredientDto {
  @IsInt()
  @Min(1)
  amount!: number;
}

class RecipeDto {
  @IsString()
  @MaxLength(5)
  name!: string;

  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients!: IngredientDto[];
}

describe('flattenValidationErrors', () => {
  it('разворачивает вложенные ошибки в пути вида a.0.b', () => {
    const errors: ValidationError[] = [
      { property: 'name', constraints: { maxLength: 'too long' }, children: [] },
      {
        property: 'ingredients',
        children: [
          {
            property: '0',
            children: [{ property: 'amount', constraints: { min: 'too small' }, children: [] }],
          },
        ],
      },
    ];
    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'name', message: 'too long' },
      { field: 'ingredients.0.amount', message: 'too small' },
    ]);
  });
});

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const metadata = { type: 'body' as const, metatype: RecipeDto };

  it('корректное тело проходит и приводится к DTO', async () => {
    const result: unknown = await pipe.transform(
      { name: 'Суп', ingredients: [{ amount: 2 }] },
      metadata,
    );
    expect(result).toBeInstanceOf(RecipeDto);
  });

  it('ошибки — AppException 400 validation_failed со списком полей', async () => {
    const error: unknown = await pipe
      .transform({ name: 'Слишком длинное', ingredients: [{ amount: 0 }] }, metadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppException);
    const exception = error as AppException;
    expect(exception.getStatus()).toBe(400);
    expect(exception.code).toBe('validation_failed');
    expect(exception.details?.map((d) => d.field)).toEqual(['name', 'ingredients.0.amount']);
  });

  it('лишние поля запрещены', async () => {
    const error: unknown = await pipe
      .transform({ name: 'Суп', ingredients: [], admin: true }, metadata)
      .catch((e: unknown) => e);

    expect((error as AppException).details).toEqual([expect.objectContaining({ field: 'admin' })]);
  });
});
