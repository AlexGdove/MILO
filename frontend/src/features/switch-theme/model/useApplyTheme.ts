import { useEffect } from 'react';

import { applyTheme, useThemeStore } from './theme';

/** Держит тему документа в соответствии с выбором (подключается один раз в корне приложения). */
export const useApplyTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  useEffect(() => applyTheme(theme), [theme]);
};
