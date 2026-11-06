import { Select } from '@/shared/ui';

import styles from './LanguageSwitcher.module.css';
import { LANGUAGES } from '../model/languages';

/** Выбор языка. Других языков пока нет — выбор показан, чтобы было видно, где он появится. */
export const LanguageSwitcher = () => (
  <div className={styles.root}>
    <label className={styles.label} htmlFor="app-language">
      Язык интерфейса
    </label>
    <Select id="app-language" defaultValue="ru" disabled={LANGUAGES.length < 2}>
      {LANGUAGES.map((language) => (
        <option key={language.value} value={language.value}>
          {language.label}
        </option>
      ))}
    </Select>
    <p className={styles.hint}>Другие языки появятся позже.</p>
  </div>
);
