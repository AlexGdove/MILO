import {
  DEFAULT_PHOTO_AI_PLUS_WEEKLY_LIMIT,
  DEFAULT_PHOTO_AI_FREE_WEEKLY_LIMIT,
  DEFAULT_PHOTO_AI_MAX_WAITING,
  DEFAULT_PHOTO_AI_PRO_WEEKLY_LIMIT,
  DEFAULT_PHOTO_AI_TIMEOUT_MS,
  toPhotoAiConfig,
} from './photo-ai.config.js';

describe('toPhotoAiConfig', () => {
  it('без настроек распознавание выключено, остальное — по умолчанию', () => {
    expect(toPhotoAiConfig({})).toEqual({
      enabled: false,
      provider: 'off',
      baseUrl: '',
      model: null,
      apiKey: null,
      project: null,
      timeoutMs: DEFAULT_PHOTO_AI_TIMEOUT_MS,
      plusWeeklyLimit: DEFAULT_PHOTO_AI_PLUS_WEEKLY_LIMIT,
      proWeeklyLimit: DEFAULT_PHOTO_AI_PRO_WEEKLY_LIMIT,
      freeWeeklyLimit: DEFAULT_PHOTO_AI_FREE_WEEKLY_LIMIT,
      maxWaiting: DEFAULT_PHOTO_AI_MAX_WAITING,
    });
  });

  it('включено только с провайдером и адресом сразу', () => {
    const url = 'http://model.test';
    expect(toPhotoAiConfig({ PHOTO_AI_PROVIDER: 'openai', PHOTO_AI_BASE_URL: url }).enabled).toBe(
      true,
    );
    expect(toPhotoAiConfig({ PHOTO_AI_PROVIDER: 'openai' }).enabled).toBe(false);
    expect(toPhotoAiConfig({ PHOTO_AI_PROVIDER: 'off', PHOTO_AI_BASE_URL: url }).enabled).toBe(
      false,
    );
    expect(toPhotoAiConfig({ PHOTO_AI_BASE_URL: url }).enabled).toBe(false);
  });

  it('убирает завершающие «/» у адреса', () => {
    const config = toPhotoAiConfig({
      PHOTO_AI_PROVIDER: 'openai',
      PHOTO_AI_BASE_URL: 'http://127.0.0.1:8080///',
    });
    expect(config.baseUrl).toBe('http://127.0.0.1:8080');
  });

  it('числа из окружения приходят строками — приводятся к числам', () => {
    const config = toPhotoAiConfig({
      PHOTO_AI_TIMEOUT_MS: '5000',
      PHOTO_AI_PLUS_WEEKLY_LIMIT: '3',
      PHOTO_AI_PRO_WEEKLY_LIMIT: '10',
      PHOTO_AI_FREE_WEEKLY_LIMIT: '0',
    });
    expect(config.timeoutMs).toBe(5000);
    expect(config.plusWeeklyLimit).toBe(3);
    expect(config.proWeeklyLimit).toBe(10);
    // 0 — допустимо: бесплатные фото выключены
    expect(config.freeWeeklyLimit).toBe(0);
  });

  it('переносит модель, ключ и проект', () => {
    const config = toPhotoAiConfig({
      PHOTO_AI_MODEL: 'qwen',
      PHOTO_AI_API_KEY: 'secret-key',
      PHOTO_AI_PROJECT: 'b1gfolder',
    });
    expect(config.project).toBe('b1gfolder');
    expect(config.model).toBe('qwen');
    expect(config.apiKey).toBe('secret-key');
  });
});
