import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

import type { SupportMessageDto, TicketStatusValue } from './dto/support.dto.js';

/** Комната устройства: все его подключения получают события своих обращений. */
export const deviceRoom = (deviceKeyId: string) => `device:${deviceKeyId}`;

/**
 * Доставка событий поддержки в WebSocket (`api.md`). Пространство `/support` передаёт
 * `SupportGateway` при запуске; до этого (и без подключённых клиентов) события некому
 * отправлять — это не ошибка: клиент дочитывает через REST (`?after=`).
 */
@Injectable()
export class SupportEvents {
  private namespace: Namespace | null = null;

  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }

  messageCreated(deviceKeyId: string, ticketId: string, message: SupportMessageDto): void {
    this.namespace?.to(deviceRoom(deviceKeyId)).emit('message.created', { ticketId, message });
  }

  ticketUpdated(
    deviceKeyId: string,
    ticket: { id: string; status: TicketStatusValue; updatedAt: string },
  ): void {
    this.namespace?.to(deviceRoom(deviceKeyId)).emit('ticket.updated', {
      ticketId: ticket.id,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
    });
  }
}
