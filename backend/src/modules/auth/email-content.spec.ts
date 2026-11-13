import { buildCodeEmail, EMAIL_LOGO_CID } from './email-content.js';

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

  it('html без скриптов и внешних ссылок; единственная картинка — знак внутри письма (cid)', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.html).not.toContain('<script');
    expect(email.html).not.toContain('http://');
    expect(email.html).not.toContain('https://');
    expect(email.html).not.toContain('<a ');
    expect(email.html).not.toContain('<style');
    expect(email.html.match(/<img /g)).toHaveLength(1);
    expect(email.html).toContain(`<img src="cid:${EMAIL_LOGO_CID}"`);
  });

  it('знак MILO — вложение PNG с тем же cid', () => {
    const { attachments } = buildCodeEmail('123456', 'reset_password');
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual(
      expect.objectContaining({
        filename: 'milo.png',
        contentType: 'image/png',
        cid: EMAIL_LOGO_CID,
      }),
    );
    expect(attachments[0]!.content.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('код со спецсимволами экранируется во всём html', () => {
    const email = buildCodeEmail('<b>', 'verify_email');
    expect(email.html).toContain('&lt;b&gt;');
    expect(email.html).not.toContain('<b>');
  });

  it('html: заголовок и пояснение по назначению', () => {
    const verify = buildCodeEmail('123456', 'verify_email');
    expect(verify.html).toContain('Подтвердите почту');
    expect(verify.html).toContain('чтобы подтвердить почту');

    const reset = buildCodeEmail('654321', 'reset_password');
    expect(reset.html).toContain('Новый пароль');
    expect(reset.html).toContain('чтобы задать новый пароль');
    expect(reset.html).not.toContain('Подтвердите почту');
  });

  it('html: фирменные цвета и светлая схема', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.html).toContain('#2F3BD9');
    expect(email.html).toContain('#EEF0FF');
    expect(email.html).toContain('name="color-scheme" content="light"');
  });

  it('html: скрытый preheader с кодом', () => {
    const email = buildCodeEmail('123456', 'verify_email');
    expect(email.html).toContain('display:none');
    expect(email.html).toContain('Ваш код: 123456');
  });
});
