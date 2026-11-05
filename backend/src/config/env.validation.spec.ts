import { toAppConfig } from './app-config.js';
import { parseOrigins, validateEnv } from './env.validation.js';

const DB = { DATABASE_URL: 'postgresql://milo:milo@localhost:5432/milo' };

describe('validateEnv', () => {
  it('без переменных — значения по умолчанию', () => {
    const env = validateEnv({ ...DB });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGINS).toBe('http://localhost:5173');
  });

  it('PORT из строки приводится к числу', () => {
    expect(validateEnv({ ...DB, PORT: '8080' }).PORT).toBe(8080);
  });

  it.each(['0', 'abc', '70000'])('отклоняет PORT=%s', (port) => {
    expect(() => validateEnv({ ...DB, PORT: port })).toThrow(/PORT/);
  });

  it('отклоняет неизвестный NODE_ENV', () => {
    expect(() => validateEnv({ ...DB, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('отклоняет неизвестный LOG_LEVEL', () => {
    expect(() => validateEnv({ ...DB, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });

  it('отклоняет адрес CORS не по http(s)', () => {
    expect(() => validateEnv({ ...DB, CORS_ORIGINS: 'http://a.test, ftp://b.test' })).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it('сообщение об ошибке начинается с общего префикса', () => {
    expect(() => validateEnv({ ...DB, PORT: '0' })).toThrow(/^Invalid environment variables/);
  });

  it('без DATABASE_URL процесс не стартует', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('DATABASE_URL — только postgresql://', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://u:p@localhost/db' })).toThrow(/DATABASE_URL/);
    expect(validateEnv({ DATABASE_URL: 'postgres://u:p@db:5432/milo' }).DATABASE_URL).toBe(
      'postgres://u:p@db:5432/milo',
    );
  });

  it('посторонние переменные окружения не мешают', () => {
    expect(() => validateEnv({ ...DB, PATH: '/usr/bin', HOME: '/root' })).not.toThrow();
  });
});

describe('parseOrigins', () => {
  it('обрезает пробелы и отбрасывает пустые элементы', () => {
    expect(parseOrigins(' http://a.test , ,https://b.test ')).toEqual([
      'http://a.test',
      'https://b.test',
    ]);
  });
});

describe('toAppConfig', () => {
  it('уровень логов: silent в тестах, info по умолчанию, явный — как задан', () => {
    expect(toAppConfig(validateEnv({ ...DB, NODE_ENV: 'test' })).logLevel).toBe('silent');
    expect(toAppConfig(validateEnv({ ...DB, NODE_ENV: 'development' })).logLevel).toBe('info');
    expect(toAppConfig(validateEnv({ ...DB, NODE_ENV: 'test', LOG_LEVEL: 'debug' })).logLevel).toBe(
      'debug',
    );
  });

  it('Swagger выключен в production, включён в разработке, явная настройка важнее', () => {
    expect(toAppConfig(validateEnv({ ...DB, NODE_ENV: 'production' })).swaggerEnabled).toBe(false);
    expect(toAppConfig(validateEnv({ ...DB, NODE_ENV: 'development' })).swaggerEnabled).toBe(true);
    expect(
      toAppConfig(validateEnv({ ...DB, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }))
        .swaggerEnabled,
    ).toBe(true);
    expect(
      toAppConfig(validateEnv({ ...DB, NODE_ENV: 'development', SWAGGER_ENABLED: 'false' }))
        .swaggerEnabled,
    ).toBe(false);
  });

  it('список адресов CORS разбирается в массив', () => {
    expect(
      toAppConfig(validateEnv({ ...DB, CORS_ORIGINS: 'http://a.test,https://b.test' })).corsOrigins,
    ).toEqual(['http://a.test', 'https://b.test']);
  });
});
