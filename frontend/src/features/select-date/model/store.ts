import { create } from 'zustand';

import { shiftIsoDate, todayIsoDate, type IsoDate } from '@/shared/lib';

interface SelectedDateState {
  date: IsoDate;
  setDate: (date: IsoDate) => void;
  shift: (days: number) => void;
}

/** Выбранный день — общий для дневника и сводки. Не сохраняется: при запуске всегда «сегодня». */
export const useSelectedDateStore = create<SelectedDateState>()((set) => ({
  date: todayIsoDate(),
  setDate: (date) => set({ date }),
  shift: (days) => set((state) => ({ date: shiftIsoDate(state.date, days) })),
}));

export const useSelectedDate = () => useSelectedDateStore((state) => state.date);
