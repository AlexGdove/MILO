import {
  OpenAiCompatibleVisionProvider,
  VisionProviderError,
  type VisionRequest,
} from './vision-provider.js';

interface Call {
  url: string;
  init: RequestInit | undefined;
}

interface RequestBody {
  model?: string;
  messages: {
    role: string;
    content: { type: string; image_url?: { url: string }; text?: string }[];
  }[];
  max_tokens: number;
  chat_template_kwargs: { enable_thinking: boolean };
}

/** `fetch` вместо настоящего: записывает вызовы (в ESM-режиме Jest нет `jest.fn`). */
const fakeFetch = (reply: () => Promise<Response>) => {
  const calls: Call[] = [];
  const impl: typeof fetch = (input, init) => {
    calls.push({ url: String(input as string), init });
    return reply();
  };
  return { calls, impl };
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
const ok = () => json({ choices: [{ message: { content: '{"dish":"Суп"}' } }] });

const REQUEST: VisionRequest = { imageBase64: 'QUJD', mime: 'image/jpeg', prompt: 'Что на фото?' };
const CONFIG = {
  baseUrl: 'http://model.test',
  model: null,
  apiKey: null,
  project: null,
  timeoutMs: 1000,
};

const reasonOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VisionProviderError) return error.reason;
    throw error;
  }
  throw new Error('ошибки не было');
};

const bodyOf = (call: Call | undefined): RequestBody =>
  JSON.parse(String(call?.init?.body as string)) as RequestBody;

describe('OpenAiCompatibleVisionProvider', () => {
  it('возвращает текст ответа модели', async () => {
    const provider = new OpenAiCompatibleVisionProvider(CONFIG, fakeFetch(ok).impl);
    expect(await provider.recognize(REQUEST)).toBe('{"dish":"Суп"}');
  });

  it('шлёт POST на /v1/chat/completions с фото, запросом и без «размышлений»', async () => {
    const { calls, impl } = fakeFetch(ok);
    await new OpenAiCompatibleVisionProvider(CONFIG, impl).recognize(REQUEST);

    expect(calls[0]?.url).toBe('http://model.test/v1/chat/completions');
    expect(calls[0]?.init?.method).toBe('POST');
    const body = bodyOf(calls[0]);
    const content = body.messages[0]?.content;
    expect(content?.[0]?.image_url?.url).toBe('data:image/jpeg;base64,QUJD');
    expect(content?.[1]?.text).toBe('Что на фото?');
    expect(body.max_tokens).toBe(1024);
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(body.model).toBeUndefined();
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBeNull();
    expect(new Headers(calls[0]?.init?.headers).get('openai-project')).toBeNull();
  });

  it('облачный сервис (с ключом): модель, ключ и каталог передаются, «размышления» выключены', async () => {
    const { calls, impl } = fakeFetch(ok);
    const provider = new OpenAiCompatibleVisionProvider(
      { ...CONFIG, model: 'qwen', apiKey: 'secret', project: 'b1gfolder' },
      impl,
    );
    await provider.recognize(REQUEST);

    const body = bodyOf(calls[0]);
    expect(body.model).toBe('qwen');
    // Yandex AI Studio без этого поля тратит весь ответ на «размышления»
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('authorization')).toBe('Bearer secret');
    // Yandex AI Studio: каталог — в заголовке OpenAI-Project
    expect(headers.get('openai-project')).toBe('b1gfolder');
  });

  it.each([
    [
      'тайм-аут',
      () => Promise.reject(Object.assign(new Error('t'), { name: 'TimeoutError' })),
      'timeout',
    ],
    ['сервер недоступен', () => Promise.reject(new Error('ECONNREFUSED')), 'unreachable'],
    ['статус 500', () => json({}, 500), 'bad_status'],
    [
      'ответ не JSON',
      () => Promise.resolve(new Response('<html>', { status: 200 })),
      'bad_response',
    ],
    ['нет вариантов ответа', () => json({ choices: [] }), 'bad_response'],
    [
      'ответ из пробелов',
      () => json({ choices: [{ message: { content: '   ' } }] }),
      'bad_response',
    ],
  ] as const)('%s → ошибка с причиной', async (_name, reply, reason) => {
    const provider = new OpenAiCompatibleVisionProvider(CONFIG, fakeFetch(reply).impl);
    expect(await reasonOf(provider.recognize(REQUEST))).toBe(reason);
  });
});
