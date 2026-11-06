import { type MessageRow, type TicketRow, toMessage, toTicket } from './support.mapper.js';

const AT = new Date('2026-11-06T10:00:00.000Z');
const message = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: 'm1',
  ticketId: 't1',
  author: 'user',
  operatorId: null,
  text: 'Привет',
  createdAt: AT,
  operator: null,
  ...overrides,
});
const ticket = (messages: MessageRow[] = []): TicketRow => ({
  id: 't1',
  number: 42,
  deviceKeyId: 'd1',
  status: 'open',
  createdAt: AT,
  updatedAt: new Date('2026-11-06T11:00:00.000Z'),
  messages,
});

describe('toMessage', () => {
  it('сообщение пользователя', () => {
    expect(toMessage(message())).toEqual({
      id: 'm1',
      author: 'user',
      operatorName: null,
      text: 'Привет',
      createdAt: '2026-11-06T10:00:00.000Z',
    });
  });

  it('сообщение оператора с именем', () => {
    const msg = message({
      author: 'operator',
      operatorId: 'o1',
      operator: { displayName: 'Анна' },
    });
    expect(toMessage(msg).operatorName).toBe('Анна');
  });

  it('сообщение оператора, оператор удалён (operator: null)', () => {
    const msg = message({ author: 'operator', operatorId: 'o1', operator: null });
    expect(toMessage(msg).operatorName).toBeNull();
  });

  it('у сообщения пользователя operatorName null, даже если operator задан', () => {
    const msg = message({ operator: { displayName: 'Анна' } });
    expect(toMessage(msg).operatorName).toBeNull();
  });
});

describe('toTicket', () => {
  it('обращение с сообщением', () => {
    expect(toTicket(ticket([message()]))).toEqual({
      id: 't1',
      number: 42,
      status: 'open',
      createdAt: '2026-11-06T10:00:00.000Z',
      updatedAt: '2026-11-06T11:00:00.000Z',
      lastMessage: toMessage(message()),
    });
  });

  it('обращение без сообщений', () => {
    expect(toTicket(ticket()).lastMessage).toBeNull();
  });
});
