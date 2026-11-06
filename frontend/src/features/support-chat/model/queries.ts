import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { selectDeviceKey, useDeviceKeyStore, withDeviceKey } from '@/entities/device-key';
import {
  mergeMessage,
  type SupportMessage,
  type SupportTicket,
  supportApi,
  supportKeys,
  type TicketPage,
} from '@/entities/support-ticket';
import { ApiError, isApiEnabled } from '@/shared/api';

const EMPTY_PAGE: TicketPage = { items: [], nextCursor: null };

/**
 * Свои обращения. Без ключа устройства обращений нет — ключ не создаётся только ради
 * просмотра списка; сервер ключ не узнал (база очищена) — тоже пустой список.
 */
export function useTickets() {
  const key = useDeviceKeyStore(selectDeviceKey);
  return useQuery({
    queryKey: [...supportKeys.tickets(), key],
    enabled: isApiEnabled(),
    queryFn: async () => {
      if (!key) return EMPTY_PAGE;
      try {
        return await supportApi.list(key);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'device_key_invalid') return EMPTY_PAGE;
        throw error;
      }
    },
  });
}

export function useTicket(id: string) {
  const key = useDeviceKeyStore(selectDeviceKey);
  return useQuery({
    queryKey: supportKeys.ticket(id),
    enabled: isApiEnabled() && Boolean(key),
    queryFn: () => supportApi.get(key ?? '', id),
  });
}

export function useMessages(id: string) {
  const key = useDeviceKeyStore(selectDeviceKey);
  return useQuery({
    queryKey: supportKeys.messages(id),
    enabled: isApiEnabled() && Boolean(key),
    queryFn: async () => (await supportApi.messages(key ?? '', id)).items,
  });
}

/** Новое обращение; ключ устройства создаётся здесь, если его ещё не было. */
export function useCreateTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ text, idempotencyKey }: { text: string; idempotencyKey: string }) =>
      withDeviceKey((key) => supportApi.create(key, text, idempotencyKey)),
    onSuccess: ({ messages, ...ticket }) => {
      client.setQueryData<SupportTicket>(supportKeys.ticket(ticket.id), ticket);
      client.setQueryData<SupportMessage[]>(supportKeys.messages(ticket.id), messages);
      void client.invalidateQueries({ queryKey: supportKeys.tickets() });
    },
  });
}

export function useSendMessage(ticketId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ text, idempotencyKey }: { text: string; idempotencyKey: string }) =>
      withDeviceKey((key) => supportApi.send(key, ticketId, text, idempotencyKey)),
    onSuccess: (message) => {
      client.setQueryData<SupportMessage[]>(supportKeys.messages(ticketId), (old = []) =>
        mergeMessage(old, message),
      );
      // Сообщение переоткрывает обращение — статус и список обновятся с сервера
      void client.invalidateQueries({ queryKey: supportKeys.ticket(ticketId) });
      void client.invalidateQueries({ queryKey: supportKeys.tickets() });
    },
  });
}

export function useCloseTicket(ticketId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => withDeviceKey((key) => supportApi.close(key, ticketId)),
    onSuccess: (ticket) => {
      client.setQueryData<SupportTicket>(supportKeys.ticket(ticketId), ticket);
      void client.invalidateQueries({ queryKey: supportKeys.tickets() });
    },
  });
}

/** Человекочитаемая ошибка по коду API (`docs/backend/api.md`). */
export function supportErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Что-то пошло не так. Попробуйте ещё раз.';
  switch (error.code) {
    case 'network_error':
      return 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
    case 'rate_limited':
      return 'Слишком много сообщений подряд. Подождите немного и попробуйте снова.';
    case 'ticket_not_found':
      return 'Обращение не найдено.';
    case 'validation_failed':
      return 'Сообщение должно быть от 1 до 4000 символов.';
    case 'service_unavailable':
      return 'Сервер временно недоступен. Попробуйте позже.';
    default:
      return 'Не получилось отправить. Попробуйте ещё раз.';
  }
}
