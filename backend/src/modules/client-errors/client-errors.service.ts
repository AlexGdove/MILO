import { Injectable } from '@nestjs/common';

import type { ClientErrorDto } from './dto/client-error.dto.js';
import { errorFingerprint, isNotifyCount } from './fingerprint.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Событие outbox: ошибка, о которой нужно сообщить операторам (первая и каждая степень десяти). */
export const CLIENT_ERROR_EVENT = 'client_error.reported';

/** Путь страницы без параметров и фрагмента: в адресе могут оказаться чужие данные. */
const pathOnly = (route: string | undefined): string | null => {
  if (!route) return null;
  const path = route.split(/[?#]/)[0] ?? '';
  return path.startsWith('/') ? path.slice(0, 200) : null;
};

@Injectable()
export class ClientErrorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Записывает ошибку; одинаковая — увеличивает счётчик. О новой и редких порогах — в outbox. */
  async report(dto: ClientErrorDto): Promise<void> {
    const fingerprint = errorFingerprint(dto);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.clientError.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          kind: dto.kind,
          message: dto.message,
          stack: dto.stack ?? null,
          platform: dto.platform,
          appVersion: dto.appVersion,
          route: pathOnly(dto.route),
          userAgent: dto.userAgent ?? null,
        },
        update: { count: { increment: 1 }, lastSeenAt: now },
      });
      if (isNotifyCount(row.count)) {
        await tx.outboxEvent.create({
          data: { type: CLIENT_ERROR_EVENT, payload: { id: row.id, count: row.count } },
        });
      }
    });
  }
}
