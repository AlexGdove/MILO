import { useParams } from 'react-router-dom';

import { useSupportRealtime, useTicket } from '@/features/support-chat';
import { ROUTES } from '@/shared/config';
import { BackLink, PageLayout } from '@/shared/ui';
import { SupportConversation } from '@/widgets/support-chat';

/** Переписка по обращению в поддержку; ответы приходят в реальном времени. */
export const SupportTicketPage = () => {
  const { id = '' } = useParams();
  const ticket = useTicket(id);
  useSupportRealtime();

  return (
    <PageLayout
      title={ticket.data ? `Обращение № ${ticket.data.number}` : 'Обращение'}
      eyebrow={<BackLink to={ROUTES.support} label="Поддержка" />}
    >
      <SupportConversation ticketId={id} />
    </PageLayout>
  );
};
