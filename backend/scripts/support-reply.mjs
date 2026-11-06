// Локальная разработка: ответить в обращение «как оператор», пока нет бота поддержки (этап 9).
// Нужен запущенный backend с DEV_TOOLS=true (backend/.env). Ответ сразу придёт в приложение
// через WebSocket.
//   npm run support:reply -w backend -- <номер обращения> "Текст ответа"
const [number, ...words] = process.argv.slice(2);
const text = words.join(' ').trim();
if (!/^\d+$/.test(number ?? '') || !text) {
  console.error('Использование: npm run support:reply -w backend -- <номер> "Текст ответа"');
  process.exit(1);
}
const port = process.env.PORT ?? '3000';
const url = `http://localhost:${port}/api/v1/dev/support/tickets/${number}/reply`;
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.error?.code ?? res.statusText;
    const hint =
      code === 'not_found'
        ? ' (служебные маршруты выключены: DEV_TOOLS=true в backend/.env и перезапуск)'
        : '';
    console.error(`Ошибка ${res.status}: ${code}${hint}`);
    process.exit(1);
  }
  console.log(`Ответ отправлен в обращение № ${number}`);
} catch {
  console.error(`Сервер не отвечает на ${url} — запустите npm run dev`);
  process.exit(1);
}
