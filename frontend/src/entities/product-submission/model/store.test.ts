import { beforeEach, describe, expect, it } from 'vitest';

import { selectHasPending, selectSubmission, useSubmissionStore } from './store';
import type { ProductSubmission } from './types';
import { rejectionReason } from '../lib/flagLabels';

const submission = (
  id: string,
  status: ProductSubmission['status'],
  flags: string[] = [],
): ProductSubmission => ({
  id,
  status,
  flags,
  reviewedBy: null,
  productId: null,
  name: 'Йогурт',
  brand: null,
  barcode: null,
  createdAt: '2026-11-07T00:00:00.000Z',
});

const store = () => useSubmissionStore.getState();
const record = (productId: string, item: ProductSubmission) => store().record(productId, item);
const applyServer = (items: ProductSubmission[]) => store().applyServer(items);
const forget = (productId: string) => store().forget(productId);

beforeEach(() => {
  useSubmissionStore.setState({ byProduct: {} });
});

describe('store', () => {
  it('record сохраняет статус и замечания для продукта', () => {
    record('p1', submission('s1', 'pending', ['energy_mismatch']));
    expect(selectSubmission('p1')(store())).toEqual({
      id: 's1',
      status: 'pending',
      flags: ['energy_mismatch'],
      submittedAt: expect.any(Number) as number,
    });
  });

  it('applyServer обновляет статус по id предложения', () => {
    record('p1', submission('s1', 'pending'));
    record('p2', submission('s2', 'pending'));
    applyServer([submission('s1', 'approved'), submission('s9', 'rejected')]);
    expect(selectSubmission('p1')(store())?.status).toBe('approved');
    expect(selectSubmission('p2')(store())?.status).toBe('pending');
  });

  it('applyServer без изменений не меняет состояние', () => {
    record('p1', submission('s1', 'pending'));
    const before = store().byProduct;
    applyServer([submission('s1', 'pending')]);
    expect(store().byProduct).toBe(before);
  });

  it('selectHasPending — есть ли предложения на проверке', () => {
    expect(selectHasPending(store())).toBe(false);
    record('p1', submission('s1', 'approved'));
    expect(selectHasPending(store())).toBe(false);
    record('p2', submission('s2', 'pending'));
    expect(selectHasPending(store())).toBe(true);
  });

  it('после перезагрузки: верные записи восстанавливаются, повреждённые отбрасываются', async () => {
    localStorage.setItem(
      'milo:product-submissions',
      JSON.stringify({
        state: {
          byProduct: {
            good: { id: 's1', status: 'pending', flags: [], submittedAt: 1 },
            badStatus: { id: 's2', status: 'maybe', flags: [], submittedAt: 1 },
            noId: { status: 'approved', flags: [], submittedAt: 1 },
          },
        },
        version: 1,
      }),
    );
    await useSubmissionStore.persist.rehydrate();
    expect(Object.keys(store().byProduct)).toEqual(['good']);
  });

  it('forget удаляет запись продукта', () => {
    record('p1', submission('s1', 'pending'));
    forget('p1');
    expect(selectSubmission('p1')(store())).toBeUndefined();
  });
});

describe('rejectionReason', () => {
  it('понятная причина по коду', () => {
    expect(rejectionReason(['gibberish'])).toBe('название не похоже на продукт');
    expect(rejectionReason(['energy_mismatch', 'link_or_contact'])).toBe(
      'в названии ссылка или контакт',
    );
  });

  it('неизвестные коды — общая причина', () => {
    expect(rejectionReason([])).toBe('не прошло проверку');
    expect(rejectionReason(['name_conflict'])).toBe('не прошло проверку');
  });
});
