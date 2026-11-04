/** Дата в формате YYYY-MM-DD по локальному времени. */
export type IsoDate = string;

const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDate = (date: Date = new Date()): IsoDate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayIsoDate = (): IsoDate => toIsoDate(new Date());

export const fromIsoDate = (isoDate: IsoDate): Date => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const shiftIsoDate = (isoDate: IsoDate, days: number): IsoDate => {
  const date = fromIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

/** «Сегодня», «Вчера», «Завтра» или «пн, 3 ноября». */
export const formatDayLabel = (isoDate: IsoDate): string => {
  const today = todayIsoDate();
  if (isoDate === today) return 'Сегодня';
  if (isoDate === shiftIsoDate(today, -1)) return 'Вчера';
  if (isoDate === shiftIsoDate(today, 1)) return 'Завтра';
  return dayFormatter.format(fromIsoDate(isoDate));
};
