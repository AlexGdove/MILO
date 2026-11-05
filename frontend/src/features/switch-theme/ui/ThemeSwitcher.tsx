import { SegmentedControl } from '@/shared/ui';

import styles from './ThemeSwitcher.module.css';
import { THEME_OPTIONS, useThemeStore } from '../model/theme';

/** Светлая / тёмная тема или «Авто» (как в системе); выбор запоминается на устройстве. */
export const ThemeSwitcher = () => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className={styles.root}>
      <SegmentedControl legend="Тема" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      <p className={styles.hint}>«Авто» — как в настройках телефона или компьютера.</p>
    </div>
  );
};
