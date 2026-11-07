import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { selectDeviceKey, useDeviceKeyStore, withDeviceKey } from '@/entities/device-key';
import type { Product } from '@/entities/product';
import {
  selectHasPending,
  submissionKeys,
  submissionsApi,
  type SubmissionRequest,
  useSubmissionStore,
} from '@/entities/product-submission';
import { ApiError, isApiEnabled } from '@/shared/api';
import { createUuid } from '@/shared/lib';

export interface SuggestExtras {
  brand: string;
  barcode: string;
}

/** Описание продукта для общей базы: без остатка, минимума и даты (их сервер не получает). */
export function toSubmission(product: Product, extras: SuggestExtras): SubmissionRequest {
  const brand = extras.brand.trim();
  const barcode = extras.barcode.replace(/\s+/g, '');
  return {
    name: product.name.trim(),
    ...(brand && { brand }),
    ...(barcode && { barcode }),
    unit: product.unit,
    pieceWeight: product.unit === 'pcs' ? (product.pieceWeight ?? null) : null,
    per100g: product.per100g,
  };
}

/**
 * Предложить свой продукт в общую базу. Ключ устройства создаётся здесь, если его не было;
 * ключ идемпотентности — один на попытку: повтор после обрыва сети не создаст дубль.
 */
export function useSuggestProduct(product: Product) {
  const record = useSubmissionStore((state) => state.record);
  return useMutation({
    mutationFn: ({ extras, idempotencyKey }: { extras: SuggestExtras; idempotencyKey: string }) =>
      withDeviceKey((key) =>
        submissionsApi.submit(key, toSubmission(product, extras), idempotencyKey),
      ),
    onSuccess: (submission) => record(product.id, submission),
  });
}

export const newAttemptKey = () => createUuid();

/** Как часто спрашивать решение оператора, пока есть предложения «на проверке». */
const PENDING_REFRESH_MS = 60_000;

/**
 * Решения оператора по своим предложениям: пока что-то «на проверке», список своих
 * предложений читается при открытии и раз в минуту, статусы обновляются на устройстве.
 */
export function useSubmissionSync() {
  const key = useDeviceKeyStore(selectDeviceKey);
  const hasPending = useSubmissionStore(selectHasPending);
  const applyServer = useSubmissionStore((state) => state.applyServer);
  const query = useQuery({
    queryKey: submissionKeys.mine(key),
    enabled: isApiEnabled() && Boolean(key) && hasPending,
    queryFn: ({ signal }) => submissionsApi.listMine(key ?? '', signal),
    refetchInterval: PENDING_REFRESH_MS,
    retry: false,
  });
  useEffect(() => {
    if (query.data) applyServer(query.data);
  }, [query.data, applyServer]);
}

/** Ошибка отправки по коду API — по-русски (`docs/backend/api.md`). */
export function suggestErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Что-то пошло не так. Попробуйте ещё раз.';
  switch (error.code) {
    case 'network_error':
      return 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
    case 'rate_limited':
      return 'Слишком много предложений. Попробуйте завтра.';
    case 'device_key_blocked':
      return 'Предложения с этого устройства отключены модератором.';
    case 'validation_failed':
      return error.details.some((detail) => detail.field === 'barcode')
        ? 'Штрихкод не подходит: 8, 12, 13 или 14 цифр, как на упаковке.'
        : 'Проверьте данные продукта: название и КБЖУ.';
    case 'service_unavailable':
      return 'Сервер временно недоступен. Попробуйте позже.';
    default:
      return 'Не получилось отправить. Попробуйте ещё раз.';
  }
}
