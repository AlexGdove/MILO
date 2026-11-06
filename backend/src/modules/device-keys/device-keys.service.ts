import { Injectable } from '@nestjs/common';

import { generateDeviceKey, hashDeviceKey } from './device-key.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Ключ устройства в запросе — без хэша и самого ключа. */
export interface DeviceKeyIdentity {
  id: string;
  blocked: boolean;
}

/** `last_seen_at` обновляется не чаще раза в час — без записи в базу на каждый запрос. */
export const LAST_SEEN_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class DeviceKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Новый ключ. Сам ключ возвращается один раз, в базе остаётся только хэш. */
  async issue(): Promise<string> {
    const key = generateDeviceKey();
    await this.prisma.deviceKey.create({ data: { keyHash: hashDeviceKey(key) } });
    return key;
  }

  /** Ключ из заголовка → устройство; неизвестный ключ — `null`. */
  async resolve(key: string, now = new Date()): Promise<DeviceKeyIdentity | null> {
    const record = await this.prisma.deviceKey.findUnique({
      where: { keyHash: hashDeviceKey(key) },
      select: { id: true, blockedAt: true, lastSeenAt: true },
    });
    if (!record) return null;

    if (
      !record.lastSeenAt ||
      now.getTime() - record.lastSeenAt.getTime() >= LAST_SEEN_UPDATE_INTERVAL_MS
    ) {
      // updateMany: ключ мог быть удалён параллельным запросом — тогда просто ничего не делаем
      await this.prisma.deviceKey.updateMany({
        where: { id: record.id },
        data: { lastSeenAt: now },
      });
    }
    return { id: record.id, blocked: record.blockedAt !== null };
  }

  /** Удаляет ключ и каскадом всё, что связано с устройством (`database.md`). */
  async remove(id: string): Promise<void> {
    await this.prisma.deviceKey.deleteMany({ where: { id } });
  }
}
