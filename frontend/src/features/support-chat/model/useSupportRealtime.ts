import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { selectDeviceKey, useDeviceKeyStore } from '@/entities/device-key';
import {
  mergeMessage,
  type SupportMessage,
  type SupportTicket,
  supportKeys,
  type TicketStatus,
} from '@/entities/support-ticket';
import { isApiEnabled, socketOrigin } from '@/shared/api';

/**
 * Ответы поддержки в реальном времени (Socket.IO `/support`, `api.md`): пока открыт экран
 * поддержки, события своих обращений обновляют кэш. После переподключения кэш
 * перечитывается — пропущенное за время обрыва догружается через REST.
 */
export function useSupportRealtime(): void {
  const key = useDeviceKeyStore(selectDeviceKey);
  const client = useQueryClient();

  useEffect(() => {
    if (!key || !isApiEnabled()) return;
    const socket = io(`${socketOrigin()}/support`, {
      auth: { deviceKey: key },
      transports: ['websocket'],
    });

    socket.on('message.created', (event: { ticketId: string; message: SupportMessage }) => {
      client.setQueryData<SupportMessage[]>(supportKeys.messages(event.ticketId), (old) =>
        old ? mergeMessage(old, event.message) : old,
      );
      void client.invalidateQueries({ queryKey: supportKeys.tickets() });
    });
    socket.on(
      'ticket.updated',
      (event: { ticketId: string; status: TicketStatus; updatedAt: string }) => {
        client.setQueryData<SupportTicket>(supportKeys.ticket(event.ticketId), (old) =>
          old ? { ...old, status: event.status, updatedAt: event.updatedAt } : old,
        );
        void client.invalidateQueries({ queryKey: supportKeys.tickets() });
      },
    );
    let connectedBefore = false;
    socket.on('connect', () => {
      if (connectedBefore) void client.invalidateQueries({ queryKey: supportKeys.all });
      connectedBefore = true;
    });

    return () => {
      socket.close();
    };
  }, [key, client]);
}
