import { describe, expect, it } from 'vitest';

import { useErrorReportsStore } from './settings';

describe('useErrorReportsStore', () => {
  it('по умолчанию отчёты включены', () => {
    expect(useErrorReportsStore.getInitialState().enabled).toBe(true);
  });

  it('migrate: только явное «false» отключает; мусор и пусто — включено', () => {
    const migrate = useErrorReportsStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();
    expect(migrate?.({ enabled: false }, 0)).toEqual({ enabled: false });
    expect(migrate?.({ enabled: true }, 0)).toEqual({ enabled: true });
    expect(migrate?.({ enabled: 'no' }, 0)).toEqual({ enabled: true });
    expect(migrate?.(null, 0)).toEqual({ enabled: true });
  });
});
