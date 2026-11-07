/* global document, localStorage */
// Тема из профиля — до первой отрисовки, без вспышки светлой темы. Отдельным файлом, а не
// встроенным скриптом: строгая CSP сервера (B-24) запрещает встроенные скрипты.
// Ключ и формат — features/switch-theme (zustand persist: { state: { theme } }).
try {
  var saved = JSON.parse(localStorage.getItem('milo:theme') || 'null');
  var theme = saved && saved.state && saved.state.theme;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // хранилище недоступно — тема как в системе
}
