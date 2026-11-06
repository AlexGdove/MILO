// Версия MILO — одна на всё (решение №48): источник — корневой package.json. Скрипт разносит её
// по workspaces, в Android (versionName / versionCode) и iOS (MARKETING_VERSION /
// CURRENT_PROJECT_VERSION). Без зависимостей.
//   npm run version:sync          — разнести текущую версию
//   npm run version:patch         — 1.0.0 → 1.0.1 (каждая новая функция или исправление) и разнести
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACES = ['frontend', 'backend', 'mobile'];
const ANDROID_GRADLE = join(ROOT, 'mobile', 'android', 'app', 'build.gradle');
const IOS_PROJECT = join(ROOT, 'mobile', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/** Разбор `major.minor.patch`; другое — ошибка. */
export function parseVersion(version) {
  const match = VERSION.exec(version);
  if (!match) throw new Error(`Версия должна быть вида 1.0.0, а не «${version}»`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor > 99 || patch > 99) throw new Error('minor и patch — не больше 99');
  return { major, minor, patch };
}

/** Следующая версия: новая функция или исправление — +1 к последней цифре. */
export function bumpPatch(version) {
  const { major, minor, patch } = parseVersion(version);
  if (patch === 99) throw new Error('patch 99 — дальше повышает minor владелец проекта');
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Номер сборки для магазинов (Android versionCode, iOS CURRENT_PROJECT_VERSION): растёт вместе
 * с версией и только растёт — 1.0.0 → 10000, 1.0.1 → 10001, 1.2.3 → 10203.
 */
export function buildNumber(version) {
  const { major, minor, patch } = parseVersion(version);
  return major * 10000 + minor * 100 + patch;
}

export function applyToGradle(source, version) {
  return source
    .replace(/versionCode \d+/, `versionCode ${buildNumber(version)}`)
    .replace(/versionName "[^"]*"/, `versionName "${version}"`);
}

export function applyToXcode(source, version) {
  return source
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(
      /CURRENT_PROJECT_VERSION = [^;]+;/g,
      `CURRENT_PROJECT_VERSION = ${buildNumber(version)};`,
    );
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const update = (path, transform) => writeFileSync(path, transform(readFileSync(path, 'utf8')));

function sync(version) {
  parseVersion(version);
  const rootPackage = join(ROOT, 'package.json');
  writeJson(rootPackage, { ...readJson(rootPackage), version });
  for (const workspace of WORKSPACES) {
    const path = join(ROOT, workspace, 'package.json');
    writeJson(path, { ...readJson(path), version });
  }
  // package-lock.json хранит версии workspaces — обновляет `npm install` (см. скрипт в package.json)
  update(ANDROID_GRADLE, (source) => applyToGradle(source, version));
  update(IOS_PROJECT, (source) => applyToXcode(source, version));
  console.log(`MILO ${version} (сборка ${buildNumber(version)}): package.json, Android, iOS`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const current = readJson(join(ROOT, 'package.json')).version;
  sync(process.argv[2] === 'patch' ? bumpPatch(current) : current);
}
