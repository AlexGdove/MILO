/** Модели поддержки из `docs/backend/api.md`. */
export type TicketStatus = 'open' | 'answered' | 'closed';

export interface SupportMessage {
  id: string;
  author: 'user' | 'operator';
  operatorName: string | null;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  number: number;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: SupportMessage | null;
}

export interface TicketPage {
  items: SupportTicket[];
  nextCursor: string | null;
}

/** Текст сообщения: 1–4000 символов после обрезки (как на сервере). */
export const MESSAGE_MAX_LENGTH = 4000;

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Ждёт ответа',
  answered: 'Есть ответ',
  closed: 'Закрыто',
};

/** Добавляет сообщение, если его ещё нет (событие WebSocket и ответ REST могут прийти оба). */
export function mergeMessage(
  messages: readonly SupportMessage[],
  message: SupportMessage,
): SupportMessage[] {
  if (messages.some((m) => m.id === message.id)) return [...messages];
  return [...messages, message].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
