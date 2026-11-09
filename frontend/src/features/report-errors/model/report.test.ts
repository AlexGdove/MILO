import { describe, expect, it } from 'vitest';

import { buildReport, describeError, isNoise, scrub, type ReportContext } from './report';

const CONTEXT: ReportContext = {
  platform: 'web',
  appVersion: '1.1.2',
  route: '/pantry?tab=shopping#top',
  userAgent: 'Mozilla/5.0 test',
};

describe('scrub', () => {
  it('убирает параметры и фрагмент у адресов в тексте', () => {
    expect(scrub('fail at https://milo-app.ru/assets/a.js?v=1&token=secret:10:5', 500)).toBe(
      'fail at https://milo-app.ru/assets/a.js',
    );
    expect(scrub('see https://milo-app.ru/pantry#section now', 500)).toBe(
      'see https://milo-app.ru/pantry now',
    );
  });

  it('обрезает текст до лимита', () => {
    expect(scrub('x'.repeat(600), 500)).toHaveLength(500);
  });

  it('текст без адресов не меняет', () => {
    expect(scrub('Cannot read properties of undefined', 500)).toBe(
      'Cannot read properties of undefined',
    );
  });
});

describe('describeError', () => {
  it('Error → текст и стек', () => {
    const error = new Error('Boom');
    expect(describeError(error)).toEqual({ message: 'Boom', stack: error.stack });
  });

  it('Error без текста → имя ошибки', () => {
    expect(describeError(new TypeError('')).message).toBe('TypeError');
  });

  it('строка → текст без стека', () => {
    expect(describeError('Просто текст')).toEqual({ message: 'Просто текст' });
  });

  it('произвольный объект → JSON', () => {
    expect(describeError({ code: 7 }).message).toBe('{"code":7}');
  });

  it('undefined → непустой текст', () => {
    expect(describeError(undefined).message).toBe('undefined');
  });
});

describe('buildReport', () => {
  it('собирает только технические поля; путь страницы — без параметров', () => {
    const report = buildReport('render', new Error('Boom'), CONTEXT);

    expect(report).toMatchObject({
      kind: 'render',
      message: 'Boom',
      platform: 'web',
      appVersion: '1.1.2',
      route: '/pantry',
      userAgent: 'Mozilla/5.0 test',
    });
    expect(Object.keys(report).sort()).toEqual(
      ['appVersion', 'kind', 'message', 'platform', 'route', 'stack', 'userAgent'].sort(),
    );
  });

  it('длинные поля обрезаются под лимиты сервера', () => {
    const report = buildReport(
      'error',
      Object.assign(new Error('m'.repeat(900)), { stack: 's'.repeat(9000) }),
      { ...CONTEXT, userAgent: 'u'.repeat(900) },
    );
    expect(report.message).toHaveLength(500);
    expect(report.stack).toHaveLength(4000);
    expect(report.userAgent).toHaveLength(300);
  });

  it('пустой путь → «/»', () => {
    expect(buildReport('error', 'x', { ...CONTEXT, route: '' }).route).toBe('/');
  });
});

describe('isNoise', () => {
  it('безобидные ошибки браузера и чужих скриптов — шум', () => {
    expect(isNoise('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
    expect(isNoise('Script error.')).toBe(true);
  });

  it('настоящая ошибка — не шум', () => {
    expect(isNoise("Cannot read properties of undefined (reading 'name')")).toBe(false);
  });
});
