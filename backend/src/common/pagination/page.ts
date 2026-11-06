import { HttpStatus } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { decodeCursor, encodeCursor } from './cursor.js';
import { AppException } from '../errors/app.exception.js';

/** `?limit=&cursor=` (`api.md`: limit 1–50, по умолчанию 20). */
export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'nextCursor из предыдущей страницы' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}

/** Поле сортировки страницы: время, заданное приложением (миллисекунды), + id. */
export type PageField = 'createdAt' | 'updatedAt';

/**
 * Курсорная страница по (`field`, id) убыванию — «новые сверху». `load` получает условие
 * «после курсора» для `where` и `take` = limit + 1: лишняя строка означает, что есть ещё.
 * Испорченный курсор — `400 validation_failed`.
 */
export async function cursorPage<F extends PageField, T extends { id: string } & Record<F, Date>>(
  query: PageQueryDto,
  field: F,
  load: (after: object, take: number) => Promise<T[]>,
): Promise<{ rows: T[]; nextCursor: string | null }> {
  let after: object = {};
  if (query.cursor !== undefined) {
    const cursor = decodeCursor(query.cursor);
    if (!cursor) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'validation_failed', 'Invalid cursor', [
        { field: 'cursor', message: 'cursor is invalid' },
      ]);
    }
    after = {
      OR: [{ [field]: { lt: cursor.at } }, { [field]: cursor.at, id: { lt: cursor.id } }],
    };
  }
  const rows = await load(after, query.limit + 1);
  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  const last = pageRows.at(-1);
  return {
    rows: pageRows,
    nextCursor: hasMore && last ? encodeCursor({ at: last[field], id: last.id }) : null,
  };
}
