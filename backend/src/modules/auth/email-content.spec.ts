import { buildCodeEmail } from './email-content.js';

describe('Письмо с кодом', () => {
  it('verify_email: тема и содержание текста', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.subject).toBe('Код подтверждения MILO: 123456');
    expect(email.text).toContain('123456');
    expect(email.text).toContain('Код действует 10 минут.');
  });

  it('verify_email: html содержит lang="ru" и код', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.html).toContain('123456');
    expect(email.html).toContain('lang="ru"');
  });

  it('reset_password: тема и содержание текста', () => {
    const email = buildCodeEmail('654321', 'reset_password');
    expect(email.subject).toBe('Код для нового пароля MILO: 654321');
    expect(email.text).toContain('для смены пароля');
  });

  it('html не содержит скриптов, картинок и ссылок', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.html).not.toContain('<script');
    expect(email.html).not.toContain('http://');
    expect(email.html).not.toContain('https://');
    expect(email.html).not.toContain('<img');
  });

  it('код со спецсимволами экранируется во всём html', () => {
    const email = buildCodeEmail('<b>', 'verify_email');
    expect(email.html).toContain('&lt;b&gt;');
    expect(email.html).not.toContain('<b>');
  });
});
