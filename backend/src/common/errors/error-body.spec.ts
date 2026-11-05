import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

import { AppException } from './app.exception.js';
import { toErrorBody } from './error-body.js';

const REQUEST_ID = 'req-12345678';

describe('toErrorBody', () => {
  it('AppException: код, сообщение и детали из исключения', () => {
    const exception = new AppException(
      HttpStatus.CONFLICT,
      'version_conflict',
      'Version mismatch',
      [{ field: 'version', message: 'stale' }],
    );
    expect(toErrorBody(exception, REQUEST_ID)).toEqual({
      status: 409,
      body: {
        code: 'version_conflict',
        message: 'Version mismatch',
        details: [{ field: 'version', message: 'stale' }],
        requestId: REQUEST_ID,
      },
    });
  });

  it('AppException с пустыми деталями — без поля details', () => {
    const exception = new AppException(HttpStatus.BAD_REQUEST, 'validation_failed', 'Invalid', []);
    expect(toErrorBody(exception, REQUEST_ID).body).not.toHaveProperty('details');
  });

  it('NotFoundException → 404 not_found', () => {
    const { status, body } = toErrorBody(new NotFoundException(), REQUEST_ID);
    expect(status).toBe(404);
    expect(body.code).toBe('not_found');
    expect(body.requestId).toBe(REQUEST_ID);
  });

  it('BadRequestException → 400 bad_request с сообщением исключения', () => {
    expect(toErrorBody(new BadRequestException('bad'), REQUEST_ID)).toEqual({
      status: 400,
      body: { code: 'bad_request', message: 'bad', requestId: REQUEST_ID },
    });
  });

  it('HttpException 413 (так Nest передаёт ошибку body-parser) → payload_too_large', () => {
    const exception = new HttpException('request entity too large', 413);
    const { status, body } = toErrorBody(exception, REQUEST_ID);
    expect(status).toBe(413);
    expect(body.code).toBe('payload_too_large');
  });

  it('статус без своего кода: 4xx → http_error', () => {
    const { status, body } = toErrorBody(new HttpException('teapot', 418), REQUEST_ID);
    expect(status).toBe(418);
    expect(body.code).toBe('http_error');
  });

  it('объект, похожий на ошибку body-parser, но не HttpException → 500', () => {
    const { status, body } = toErrorBody({ status: 400, type: 'entity.parse.failed' }, REQUEST_ID);
    expect(status).toBe(500);
    expect(body.code).toBe('internal_error');
  });

  it('неизвестная ошибка → 500 без раскрытия подробностей', () => {
    const result = toErrorBody(new Error('db password leaked'), REQUEST_ID);
    expect(result).toEqual({
      status: 500,
      body: { code: 'internal_error', message: 'Internal server error', requestId: REQUEST_ID },
    });
    expect(JSON.stringify(result.body)).not.toContain('password');
  });

  it('выброшенная строка → 500 internal_error', () => {
    const { status, body } = toErrorBody('some string', REQUEST_ID);
    expect(status).toBe(500);
    expect(body.code).toBe('internal_error');
    expect(JSON.stringify(body)).not.toContain('some string');
  });
});
