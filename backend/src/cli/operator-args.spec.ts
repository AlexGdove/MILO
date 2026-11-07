import { parseOperatorArgs } from './operator-args.js';

describe('parseOperatorArgs', () => {
  it('add: Telegram ID и имя из нескольких слов', () => {
    expect(parseOperatorArgs(['add', '555001', 'Анна', 'Петрова'])).toEqual({
      command: 'add',
      telegramUserId: 555001n,
      displayName: 'Анна Петрова',
    });
  });

  it('remove и list', () => {
    expect(parseOperatorArgs(['remove', '555001'])).toEqual({
      command: 'remove',
      telegramUserId: 555001n,
    });
    expect(parseOperatorArgs(['list'])).toEqual({ command: 'list' });
  });

  it.each([
    [[]],
    [['add', '555001']],
    [['add', '-100123', 'Группа']],
    [['add', 'abc', 'Анна']],
    [['add', '555001', 'я'.repeat(65)]],
    [['remove']],
    [['remove', '555001', 'лишнее']],
    [['list', 'лишнее']],
    [['delete', '555001']],
  ])('неверные аргументы %j — null', (args) => {
    expect(parseOperatorArgs(args)).toBeNull();
  });
});
