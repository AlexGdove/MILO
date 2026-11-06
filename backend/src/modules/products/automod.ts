// Автомодерация предложений продуктов (B-18). Штата операторов нет, поэтому решение —
// автоматически, а человеку уходит только сомнительное. Правила:
//  - отклонить: мат и оскорбления, ссылки и контакты (спам), бессмыслица в названии;
//  - человеку: КБЖУ не сходятся с калорийностью, штрихкод уже есть с другим составом,
//    подозрительный текст, у автора много отклонённых предложений;
//  - иначе — принять; уже известный продукт (тот же штрихкод или название + бренд, состав
//    близкий) — принять как дубль, привязав к существующему.
// Слова и пороги — здесь, в одном месте; тесты — `automod.spec.ts`.

export type Verdict = 'approve' | 'reject' | 'review';

/** Коды замечаний: клиент показывает текст по коду, оператор видит их в Telegram. */
export type AutomodFlag =
  | 'banned_words'
  | 'link_or_contact'
  | 'gibberish'
  | 'suspicious_text'
  | 'energy_mismatch'
  | 'barcode_conflict'
  | 'name_conflict'
  | 'untrusted_author';

const REJECT_FLAGS: ReadonlySet<AutomodFlag> = new Set([
  'banned_words',
  'link_or_contact',
  'gibberish',
]);

export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface SubmissionInput extends Nutrients {
  name: string;
  brand: string | null;
}

/** Продукт общей базы, похожий на предложение (по штрихкоду или названию + бренду). */
export interface KnownProduct extends Nutrients {
  id: string;
}

export interface AutomodContext {
  /** Продукт с тем же штрихкодом */
  sameBarcode: KnownProduct | null;
  /** Продукт с тем же названием и брендом (без учёта регистра), если штрихкода нет */
  sameName: KnownProduct | null;
  /** Отклонённых предложений автора за последние 7 дней */
  recentRejections: number;
}

export interface AutomodResult {
  verdict: Verdict;
  flags: AutomodFlag[];
  /** При `approve`: уже существующий продукт, к которому привязать предложение */
  duplicateOf: string | null;
}

export const UNTRUSTED_AFTER_REJECTIONS = 3;

// --- Текст ---

/** Латиница и цифры, похожие на кириллицу (обход фильтра «xуй», «п1зда»). */
const LOOKALIKES: Record<string, string> = {
  a: 'а',
  b: 'в',
  c: 'с',
  e: 'е',
  h: 'н',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'р',
  t: 'т',
  x: 'х',
  y: 'у',
  '0': 'о',
  '1': 'и',
  '3': 'з',
  '4': 'ч',
  '6': 'б',
  '@': 'а',
  ё: 'е',
};

/** Нижний регистр, похожие символы → кириллица, только буквы и пробелы. */
export function normalizeText(text: string): string {
  return [...text.toLowerCase()]
    .map((char) => LOOKALIKES[char] ?? char)
    .join('')
    .replace(/[^a-zа-я\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Корни мата и оскорблений; совпадение — с начала слова (с приставкой или без), чтобы
 * «рубля» или «небанальный» не считались матом. Английские — в исходном написании.
 */
const BANNED_ROOTS = [
  'хуй',
  'хуе',
  'хуи',
  'хуя',
  'пизд',
  'ебат',
  'ебан',
  'ебал',
  'ебуч',
  'еби',
  'ебл',
  'бля',
  'сука',
  'суки',
  'сучк',
  'мудак',
  'мудил',
  'пидор',
  'пидар',
  'гандон',
  'шлюх',
  'залуп',
  'дерьм',
  'говн',
  'дебил',
  'ублюд',
];
/** С начала слова: «Dickmann's» или «Shiitake» в бренде не отклоняются по подстроке. */
const BANNED_LATIN = /\b(fuck|shit\b|bitch|cunt|porn|casino|viagra)/i;
const PREFIXES = ['', 'за', 'на', 'от', 'по', 'вы', 'у', 'до', 'раз', 'съ', 'под', 'при', 'о'];

function hasBannedWords(raw: string): boolean {
  if (BANNED_LATIN.test(raw)) return true;
  const words = normalizeText(raw).split(' ');
  return words.some((word) =>
    PREFIXES.some((prefix) => BANNED_ROOTS.some((root) => word.startsWith(prefix + root))),
  );
}

const LINK_OR_CONTACT = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bt\.me\b/i,
  /[a-z0-9-]+\.(ru|com|net|org|рф|su|io|me|info|biz|shop|online|site)\b/i,
  /@[a-z0-9_]{3,}/i,
  /\+?\d[\d\s()-]{8,}\d/, // телефон: 10+ цифр подряд с разделителями
];

function hasLinkOrContact(raw: string): boolean {
  return LINK_OR_CONTACT.some((pattern) => pattern.test(raw));
}

/** Название без букв или из одного повторяющегося символа («....», «ааааа»). */
function isGibberish(name: string): boolean {
  const letters = name.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return true;
  return new Set(letters.toLowerCase()).size === 1;
}

/**
 * Буква 4+ раза подряд («сыыыыр») или 3+ знака препинания подряд. Капс не проверяется:
 * названия часто переписывают с упаковки заглавными.
 */
function isSuspiciousText(raw: string): boolean {
  return /(\p{L})\1{3,}/u.test(raw) || /[!?.,]{3,}/.test(raw);
}

// --- КБЖУ ---

/** Калорийность по составу (Этуотер: Б и У — 4 ккал/г, Ж — 9 ккал/г). */
export function estimateKcal(n: Pick<Nutrients, 'protein' | 'fat' | 'carbs'>): number {
  return 4 * n.protein + 9 * n.fat + 4 * n.carbs;
}

/**
 * Калорийность не сходится с составом: разница больше 40 ккал и больше 25 %. Не отклонение,
 * а вопрос к человеку: у алкоголя, клетчатки, сахарозаменителей расчёт честно расходится.
 */
export function energyMismatch(n: Nutrients): boolean {
  const estimated = estimateKcal(n);
  const diff = Math.abs(n.kcal - estimated);
  return diff > 40 && diff > 0.25 * Math.max(n.kcal, estimated);
}

/** Состав близок: каждое значение отличается не больше чем на 10 % (и 1 г / 10 ккал). */
export function sameNutrients(a: Nutrients, b: Nutrients): boolean {
  const close = (x: number, y: number, abs: number) =>
    Math.abs(x - y) <= Math.max(abs, 0.1 * Math.max(x, y));
  return (
    close(a.kcal, b.kcal, 10) &&
    close(a.protein, b.protein, 1) &&
    close(a.fat, b.fat, 1) &&
    close(a.carbs, b.carbs, 1)
  );
}

/** Решение по предложению. Порядок кодов в `flags` — порядок проверок. */
export function moderateSubmission(input: SubmissionInput, context: AutomodContext): AutomodResult {
  const text = [input.name, input.brand ?? ''].join(' ');
  const flags: AutomodFlag[] = [];
  if (hasBannedWords(text)) flags.push('banned_words');
  if (hasLinkOrContact(text)) flags.push('link_or_contact');
  if (isGibberish(input.name)) flags.push('gibberish');

  if (flags.some((flag) => REJECT_FLAGS.has(flag))) {
    return { verdict: 'reject', flags, duplicateOf: null };
  }

  if (isSuspiciousText(text)) flags.push('suspicious_text');
  if (energyMismatch(input)) flags.push('energy_mismatch');

  let duplicateOf: string | null = null;
  const known = context.sameBarcode ?? context.sameName;
  if (known) {
    if (sameNutrients(input, known)) duplicateOf = known.id;
    else flags.push(context.sameBarcode ? 'barcode_conflict' : 'name_conflict');
  }
  if (context.recentRejections >= UNTRUSTED_AFTER_REJECTIONS) flags.push('untrusted_author');

  return flags.length > 0
    ? { verdict: 'review', flags, duplicateOf: null }
    : { verdict: 'approve', flags, duplicateOf };
}
