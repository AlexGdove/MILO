import { HttpStatus, Injectable } from '@nestjs/common';

import { moderateSubmission } from './automod.js';
import type { ProductQueryDto, SubmitProductDto } from './dto/product.dto.js';
import { toKnown, toProduct, toSubmission } from './products.mapper.js';
import { AppException } from '../../common/errors/app.exception.js';
import { cursorPage, type PageQueryDto } from '../../common/pagination/page.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

/** Событие outbox: сомнительное предложение уходит в бот модерации (этап 9, ADR-0003). */
export const SUBMISSION_REVIEW_EVENT = 'product_submission.review_requested';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NEWEST_FIRST = [{ createdAt: 'desc' }, { id: 'desc' }] as const;

/** Подстрока для ILIKE: `%`, `_` и `\` клиента — обычные символы, а не шаблон. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Поля продукта из проверенного DTO (они же — у предложения). */
export function productData(dto: SubmitProductDto) {
  return {
    name: dto.name,
    brand: dto.brand ?? null,
    barcode: dto.barcode ?? null,
    unit: dto.unit,
    pieceWeight: dto.unit === 'pcs' ? dto.pieceWeight : null,
    kcal: dto.per100g.kcal,
    protein: dto.per100g.protein,
    fat: dto.per100g.fat,
    carbs: dto.per100g.carbs,
  };
}

/** Колонки продукта из предложения — для принятия оператором. */
export function productFromSubmission(
  s: Pick<
    Prisma.ProductSubmissionGetPayload<object>,
    'name' | 'brand' | 'barcode' | 'unit' | 'pieceWeight' | 'kcal' | 'protein' | 'fat' | 'carbs'
  >,
) {
  return {
    name: s.name,
    brand: s.brand,
    barcode: s.barcode,
    unit: s.unit,
    pieceWeight: s.pieceWeight,
    kcal: s.kcal,
    protein: s.protein,
    fat: s.fat,
    carbs: s.carbs,
  };
}

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'product_not_found', 'Product not found');

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Предложение продукта: автомодерация решает сразу (`automod.ts`). Принятое — новый продукт
   * общей базы (или привязка к уже известному); сомнительное — `pending` и событие для бота
   * модерации; отклонённое — с кодами причин. Всё в одной транзакции.
   */
  async submit(deviceKeyId: string, dto: SubmitProductDto) {
    try {
      return await this.trySubmit(deviceKeyId, dto);
    } catch (error) {
      // Тот же штрихкод добавили параллельно: повтор найдёт его и сравнит состав
      if (!isUniqueViolation(error)) throw error;
      return this.trySubmit(deviceKeyId, dto);
    }
  }

  private trySubmit(deviceKeyId: string, dto: SubmitProductDto) {
    const data = productData(dto);
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const result = moderateSubmission(
        data,
        await this.automodContext(tx, deviceKeyId, data, now),
      );

      let productId: string | null = null;
      if (result.verdict === 'approve') {
        productId =
          result.duplicateOf ??
          (await tx.product.create({ data: { ...data, createdAt: now }, select: { id: true } })).id;
      }
      const decided = result.verdict !== 'review';
      const submission = await tx.productSubmission.create({
        data: {
          ...data,
          deviceKeyId,
          status:
            result.verdict === 'approve'
              ? 'approved'
              : result.verdict === 'reject'
                ? 'rejected'
                : 'pending',
          flags: result.flags,
          reviewedBy: decided ? 'auto' : null,
          reviewedAt: decided ? now : null,
          productId,
          createdAt: now,
        },
      });
      if (!decided) {
        // Без текстов: бот читает предложение из базы при отправке (database.md)
        await tx.outboxEvent.create({
          data: { type: SUBMISSION_REVIEW_EVENT, payload: { submissionId: submission.id } },
        });
      }
      return toSubmission(submission);
    });
  }

  private async automodContext(
    tx: Tx,
    deviceKeyId: string,
    data: ReturnType<typeof productData>,
    now: Date,
  ) {
    const sameBarcode = data.barcode
      ? await tx.product.findUnique({ where: { barcode: data.barcode } })
      : null;
    // По названию + бренду сравниваем только продукты без чужого штрихкода
    const sameName = sameBarcode
      ? null
      : await tx.product.findFirst({
          where: {
            name: { equals: data.name, mode: 'insensitive' },
            brand: data.brand ? { equals: data.brand, mode: 'insensitive' } : null,
            OR: [{ barcode: null }, ...(data.barcode ? [{ barcode: data.barcode }] : [])],
          },
          orderBy: { createdAt: 'asc' },
        });
    const recentRejections = await tx.productSubmission.count({
      where: {
        deviceKeyId,
        status: 'rejected',
        createdAt: { gte: new Date(now.getTime() - WEEK_MS) },
      },
    });
    return { sameBarcode: toKnown(sameBarcode), sameName: toKnown(sameName), recentRejections };
  }

  /** Общая база: поиск по подстроке названия или бренда, точный штрихкод, новые сверху. */
  async catalog(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.barcode ? { barcode: query.barcode } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: escapeLike(query.q), mode: 'insensitive' } },
              { brand: { contains: escapeLike(query.q), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const page = await cursorPage(query, 'createdAt', (after, take) =>
      this.prisma.product.findMany({
        where: { AND: [where, after] },
        orderBy: [...NEWEST_FIRST],
        take,
      }),
    );
    return { items: page.rows.map(toProduct), nextCursor: page.nextCursor };
  }

  async get(id: string) {
    const row = await this.prisma.product.findUnique({ where: { id } });
    if (!row) throw notFound();
    return toProduct(row);
  }

  /** Свои предложения со статусами, новые сверху. */
  async mine(deviceKeyId: string, query: PageQueryDto) {
    const page = await cursorPage(query, 'createdAt', (after, take) =>
      this.prisma.productSubmission.findMany({
        where: { AND: [{ deviceKeyId }, after] },
        orderBy: [...NEWEST_FIRST],
        take,
      }),
    );
    return { items: page.rows.map(toSubmission), nextCursor: page.nextCursor };
  }
}
