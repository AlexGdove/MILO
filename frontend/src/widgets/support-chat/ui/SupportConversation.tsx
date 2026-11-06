import { useEffect, useRef } from 'react';

import { TICKET_STATUS_LABEL } from '@/entities/support-ticket';
import {
  CloseTicketButton,
  ReplyForm,
  supportErrorText,
  useMessages,
  useTicket,
} from '@/features/support-chat';
import { cn } from '@/shared/lib';
import { Card, EmptyState, Skeleton } from '@/shared/ui';

import styles from './SupportConversation.module.css';

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Переписка по обращению: сообщения, статус, ответ и «Вопрос решён». */
export const SupportConversation = ({ ticketId }: { ticketId: string }) => {
  const ticket = useTicket(ticketId);
  const messages = useMessages(ticketId);
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages.data?.length ?? 0;

  // Новое сообщение (своё или ответ оператора) — показать его
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [count]);

  if (ticket.isError || messages.isError) {
    return (
      <EmptyState
        title="Не удалось открыть обращение"
        description={supportErrorText(ticket.error ?? messages.error)}
      />
    );
  }
  if (!ticket.data || !messages.data) return <Skeleton height="160px" radius="lg" />;

  const closed = ticket.data.status === 'closed';
  return (
    <div className={styles.root}>
      <div className={styles.status}>
        <span className={cn(styles.badge, styles[ticket.data.status])}>
          {TICKET_STATUS_LABEL[ticket.data.status]}
        </span>
        {!closed && <CloseTicketButton ticketId={ticketId} />}
      </div>

      <ol className={styles.messages} aria-label="Сообщения">
        {messages.data.map((message) => (
          <li
            key={message.id}
            className={cn(styles.message, message.author === 'user' ? styles.mine : styles.theirs)}
          >
            <p className={styles.author}>
              {message.author === 'user' ? 'Вы' : (message.operatorName ?? 'Поддержка')}
            </p>
            <p className={styles.text}>{message.text}</p>
            <time className={styles.time} dateTime={message.createdAt}>
              {timeFormat.format(new Date(message.createdAt))}
            </time>
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      <Card>
        <ReplyForm ticketId={ticketId} closed={closed} />
      </Card>
    </div>
  );
};
