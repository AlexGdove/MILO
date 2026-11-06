import { MessageForm } from './MessageForm';
import { useSendMessage } from '../model/queries';

interface ReplyFormProps {
  ticketId: string;
  closed: boolean;
}

/** Сообщение в обращение; в закрытое — переоткрывает его. */
export const ReplyForm = ({ ticketId, closed }: ReplyFormProps) => {
  const send = useSendMessage(ticketId);
  return (
    <MessageForm
      label={closed ? 'Написать — обращение откроется снова' : 'Сообщение'}
      placeholder="Ваше сообщение"
      submitLabel="Отправить"
      pending={send.isPending}
      error={send.error}
      onSend={(text, idempotencyKey) => send.mutateAsync({ text, idempotencyKey })}
    />
  );
};
