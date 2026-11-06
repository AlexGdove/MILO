import type { SupportMessageDto, SupportTicketDto } from './dto/support.dto.js';
import type { Prisma } from '../../generated/prisma/client.js';

/** Сообщение с именем оператора (для ответа клиенту). */
export const MESSAGE_INCLUDE = { operator: { select: { displayName: true } } } as const;
export type MessageRow = Prisma.SupportMessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

/** Последнее сообщение обращения — для списка. */
export const TICKET_INCLUDE = {
  messages: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
    include: MESSAGE_INCLUDE,
  },
} satisfies Prisma.SupportTicketInclude;
export type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof TICKET_INCLUDE }>;

export function toMessage(row: MessageRow): SupportMessageDto {
  return {
    id: row.id,
    author: row.author,
    // Имя только у сообщений оператора; оператор мог быть удалён (связь обнуляется)
    operatorName: row.author === 'operator' ? (row.operator?.displayName ?? null) : null,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toTicket(row: TicketRow): SupportTicketDto {
  const last = row.messages[0];
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessage: last ? toMessage(last) : null,
  };
}
