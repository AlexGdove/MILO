import type { PhotoAiConfig } from './photo-ai.config.js';

export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface VisionRequest {
  /** Картинка в base64 без префикса `data:` */
  imageBase64: string;
  mime: PhotoMime;
  /** Текст запроса: задание, справочник названий и подсказка пользователя */
  prompt: string;
}

/**
 * Провайдер распознавания (решение №68): получает фото и запрос, возвращает сырой текст ответа
 * модели. Разбор и расчёт КБЖУ — в коде бэкенда, не в провайдере. Реализация выбирается
 * настройкой `PHOTO_AI_PROVIDER`; в тестах подменяется.
 */
export abstract class VisionProvider {
  abstract recognize(request: VisionRequest): Promise<string>;
}

/** Модель не ответила вовремя или ответила ошибкой — пользователю «попробуйте позже». */
export class VisionProviderError extends Error {
  constructor(
    readonly reason: 'timeout' | 'unreachable' | 'bad_status' | 'bad_response',
    message: string,
  ) {
    super(message);
    this.name = 'VisionProviderError';
  }
}

interface ChatCompletion {
  choices?: { message?: { content?: unknown } }[];
}

/** Ответ короткий (JSON на десяток ингредиентов); предел защищает от «болтовни» модели */
const MAX_OUTPUT_TOKENS = 1024;

/**
 * Сервер с OpenAI-совместимым `POST /v1/chat/completions` и приёмом картинок (`image_url`):
 * локальная Strata с Qwen3.6 (решение №75), позже — облачная модель с тем же протоколом.
 * Фото уходит только на этот сервер и нигде не сохраняется.
 */
export class OpenAiCompatibleVisionProvider extends VisionProvider {
  constructor(
    private readonly config: Pick<
      PhotoAiConfig,
      'baseUrl' | 'model' | 'apiKey' | 'project' | 'timeoutMs'
    >,
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    super();
  }

  async recognize(request: VisionRequest): Promise<string> {
    const { baseUrl, model, apiKey, project, timeoutMs } = this.config;
    let response: Response;
    try {
      response = await this.fetchImpl(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          ...(project ? { 'openai-project': project } : {}),
        },
        body: JSON.stringify({
          ...(model ? { model } : {}),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${request.mime};base64,${request.imageBase64}` },
                },
                { type: 'text', text: request.prompt },
              ],
            },
          ],
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
          // Qwen без «размышлений»: в Strata ответ в 3–4 раза быстрее; Yandex AI Studio без этого
          // тратит весь max_tokens на размышления и возвращает пустой ответ (проверено 2026-11-16)
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new VisionProviderError(
        timedOut ? 'timeout' : 'unreachable',
        timedOut ? 'Vision model timed out' : 'Vision model is unreachable',
      );
    }
    if (!response.ok) {
      throw new VisionProviderError('bad_status', `Vision model replied ${response.status}`);
    }
    let body: ChatCompletion;
    try {
      body = (await response.json()) as ChatCompletion;
    } catch {
      throw new VisionProviderError('bad_response', 'Vision model reply is not JSON');
    }
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new VisionProviderError('bad_response', 'Vision model reply has no text');
    }
    return content;
  }
}
