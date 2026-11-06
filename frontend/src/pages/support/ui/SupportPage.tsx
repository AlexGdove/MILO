import { Link, useNavigate } from 'react-router-dom';

import { TICKET_STATUS_LABEL } from '@/entities/support-ticket';
import {
  NewTicketForm,
  supportErrorText,
  useSupportRealtime,
  useTickets,
} from '@/features/support-chat';
import { isApiEnabled } from '@/shared/api';
import { ROUTES, supportTicketPath } from '@/shared/config';
import { BackLink, Card, EmptyState, PageLayout, Skeleton } from '@/shared/ui';

import styles from './SupportPage.module.css';

const back = <BackLink to={ROUTES.settings} label="Настройки" />;

/** Свои обращения в поддержку и новое обращение (решение №43, сервер — B-19). */
export const SupportPage = () => {
  const navigate = useNavigate();
  const tickets = useTickets();
  useSupportRealtime();

  if (!isApiEnabled()) {
    return (
      <PageLayout title="Техподдержка" eyebrow={back}>
        <EmptyState
          title="Поддержка пока недоступна"
          description="Приложение не подключено к серверу. Остальное работает как обычно."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Техподдержка" eyebrow={back}>
      <p className={styles.intro}>
        Напишите нам — ответ придёт сюда. Вход и личные данные не нужны: обращения привязаны к этому
        устройству.
      </p>
      <Card>
        <NewTicketForm onCreated={(id) => void navigate(supportTicketPath(id))} />
      </Card>

      {tickets.isPending && <Skeleton height="64px" radius="lg" />}
      {tickets.isError && (
        <EmptyState
          title="Не удалось загрузить обращения"
          description={supportErrorText(tickets.error)}
        />
      )}
      {tickets.data && tickets.data.items.length > 0 && (
        <section aria-label="Мои обращения">
          <h2 className={styles.heading}>Мои обращения</h2>
          <ul className={styles.list}>
            {tickets.data.items.map((ticket) => (
              <li key={ticket.id}>
                <Link to={supportTicketPath(ticket.id)} className={styles.ticket}>
                  <span className={styles.row}>
                    <span className={styles.number}>Обращение № {ticket.number}</span>
                    <span className={styles.status}>{TICKET_STATUS_LABEL[ticket.status]}</span>
                  </span>
                  {ticket.lastMessage && (
                    <span className={styles.preview}>
                      {ticket.lastMessage.author === 'operator' ? 'Поддержка: ' : 'Вы: '}
                      {ticket.lastMessage.text}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
};
