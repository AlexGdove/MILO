import type { Plan } from './types';

/** Название тарифа для интерфейса (решение №68). */
export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Бесплатный',
  plus: 'Plus',
  unlimited: 'Безлимитный',
};
