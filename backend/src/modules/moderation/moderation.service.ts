import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '../../common/errors/app.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { productFromSubmission } from '../products/products.service.js';

type Tx = Prisma.TransactionClient;

/**
 * Решения оператора (B-18) — только по тому, что автомодерация отправила человеку
 * (`pending`): принять в общую базу или отклонить; заблокировать или разблокировать ключ.
 * Каждое действие — в журнал `moderation_actions` в той же транзакции. HTTP-маршрутов нет:
 * сервис вызывает бот модерации в Telegram (этап 9). Действует только активный оператор.
 */
@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Принять: продукт с тем же штрихкодом уже есть — привязать к нему, иначе создать. */
  approveSubmission(operatorId: string, submissionId: string): Promise<{ productId: string }> {
    return this.inTransaction(operatorId, async (tx, now) => {
      const submission = await this.pendingSubmission(tx, submissionId);
      const existing = submission.barcode
        ? await tx.product.findUnique({
            where: { barcode: submission.barcode },
            select: { id: true },
          })
        : null;
      const productId =
        existing?.id ??
        (
          await tx.product.create({
            data: { ...productFromSubmission(submission), createdAt: now },
            select: { id: true },
          })
        ).id;
      await tx.productSubmission.update({
        where: { id: submissionId },
        data: { status: 'approved', reviewedBy: 'operator', reviewedAt: now, productId },
      });
      await tx.moderationAction.create({
        data: { operatorId, submissionId, action: 'approve_submission' },
      });
      return { productId };
    });
  }

  reject(operatorId: string, submissionId: string): Promise<void> {
    return this.inTransaction(operatorId, async (tx, now) => {
      await this.pendingSubmission(tx, submissionId);
      await tx.productSubmission.update({
        where: { id: submissionId },
        data: { status: 'rejected', reviewedBy: 'operator', reviewedAt: now },
      });
      await tx.moderationAction.create({
        data: { operatorId, submissionId, action: 'reject_submission' },
      });
    });
  }

  /** Заблокировать ключ: запись (предложения, обращения) — `403 device_key_blocked`. */
  blockDeviceKey(operatorId: string, deviceKeyId: string): Promise<void> {
    return this.setBlocked(operatorId, deviceKeyId, true);
  }

  unblockDeviceKey(operatorId: string, deviceKeyId: string): Promise<void> {
    return this.setBlocked(operatorId, deviceKeyId, false);
  }

  private setBlocked(operatorId: string, deviceKeyId: string, blocked: boolean): Promise<void> {
    return this.inTransaction(operatorId, async (tx, now) => {
      const { count } = await tx.deviceKey.updateMany({
        where: { id: deviceKeyId },
        data: { blockedAt: blocked ? now : null },
      });
      if (count === 0) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          'device_key_not_found',
          'Device key not found',
        );
      }
      await tx.moderationAction.create({
        data: { operatorId, deviceKeyId, action: blocked ? 'block_key' : 'unblock_key' },
      });
    });
  }

  /** Предложение ждёт человека; уже решённое — `409 already_reviewed`. */
  private async pendingSubmission(tx: Tx, id: string) {
    const submission = await tx.productSubmission.findUnique({ where: { id } });
    if (!submission) {
      throw new AppException(HttpStatus.NOT_FOUND, 'submission_not_found', 'Submission not found');
    }
    if (submission.status !== 'pending') {
      throw new AppException(
        HttpStatus.CONFLICT,
        'already_reviewed',
        'Submission already reviewed',
      );
    }
    return submission;
  }

  private async inTransaction<T>(
    operatorId: string,
    action: (tx: Tx, now: Date) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const operator = await tx.operator.findUnique({
        where: { id: operatorId },
        select: { active: true },
      });
      if (!operator?.active) {
        throw new AppException(HttpStatus.FORBIDDEN, 'operator_inactive', 'Operator is not active');
      }
      return action(tx, new Date());
    });
  }
}
