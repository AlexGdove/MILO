// Одновременный запуск фронтенда (Vite) и бэкенда (Nest) для разработки: `npm run dev`.
// Без зависимостей. Вывод помечается [web] / [api]; Ctrl+C или падение одного процесса
// останавливает оба (на Windows — вместе с дочерними процессами через taskkill).
import { spawn, spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const color = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);

const tasks = [
  { name: 'web', color: 36, command: 'npm run dev -w frontend' },
  { name: 'api', color: 35, command: 'npm run start:dev -w backend' },
];

const children = [];
let stopping = false;

/** Печатает вывод процесса построчно с меткой. */
function pipeWithPrefix(stream, target, prefix) {
  let rest = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = (rest + chunk).split(/\r?\n/);
    rest = lines.pop() ?? '';
    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => {
    if (rest) target.write(`${prefix} ${rest}\n`);
  });
}

function kill(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (isWindows) {
    // shell: true — убиваем всё дерево (cmd → npm → node), иначе vite/nest остаются висеть
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM'); // вся группа процессов (detached)
    } catch {
      child.kill('SIGTERM');
    }
  }
}

function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) kill(child);
  process.exitCode = exitCode;
}

for (const task of tasks) {
  const prefix = color(task.color, `[${task.name}]`);
  const child = spawn(task.command, {
    shell: true,
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: process.stdout.isTTY ? '1' : '0' },
  });
  pipeWithPrefix(child.stdout, process.stdout, prefix);
  pipeWithPrefix(child.stderr, process.stderr, prefix);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    process.stderr.write(
      `${prefix} завершился (${signal ?? `код ${code}`}) — останавливаю остальные\n`,
    );
    stopAll(code ?? 1);
  });
  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopAll(0));
}
