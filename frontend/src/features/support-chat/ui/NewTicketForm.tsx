import { MessageForm } from './MessageForm';
import { useCreateTicket } from '../model/queries';

interface NewTicketFormProps {
  /** Обращение создано — например, открыть переписку */
  onCreated: (ticketId: string) => void;
}

/** Новое обращение в поддержку: первое сообщение. Ключ устройства появится при отправке. */
export const NewTicketForm = ({ onCreated }: NewTicketFormProps) => {
  const create = useCreateTicket();
  return (
    <MessageForm
      label="Новое обращение"
      placeholder="Опишите, что случилось или что хотите предложить"
      submitLabel="Отправить"
      pending={create.isPending}
      error={create.error}
      onSend={async (text, idempotencyKey) => {
        const ticket = await create.mutateAsync({ text, idempotencyKey });
        onCreated(ticket.id);
      }}
    />
  );
};
