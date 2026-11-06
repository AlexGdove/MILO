import { Button } from '@/shared/ui';

import { useCloseTicket } from '../model/queries';

/** «Вопрос решён» — закрыть обращение (новое сообщение откроет его снова). */
export const CloseTicketButton = ({ ticketId }: { ticketId: string }) => {
  const close = useCloseTicket(ticketId);
  return (
    <Button variant="ghost" size="small" disabled={close.isPending} onClick={() => close.mutate()}>
      Вопрос решён
    </Button>
  );
};
