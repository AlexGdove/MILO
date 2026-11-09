import { SegmentedControl } from '@/shared/ui';

import styles from './ErrorReportsToggle.module.css';
import { useErrorReportsStore } from '../model/settings';

type Choice = 'on' | 'off';

const OPTIONS: ReadonlyArray<{ value: Choice; label: string }> = [
  { value: 'on', label: 'Отправлять' },
  { value: 'off', label: 'Не отправлять' },
];

/** Включение и отключение отчётов об ошибках (решение №62); выбор запоминается на устройстве. */
export const ErrorReportsToggle = () => {
  const enabled = useErrorReportsStore((state) => state.enabled);
  const setEnabled = useErrorReportsStore((state) => state.setEnabled);

  return (
    <div className={styles.root}>
      <SegmentedControl
        legend="Отчёты об ошибках"
        options={OPTIONS}
        value={enabled ? 'on' : 'off'}
        onChange={(choice) => setEnabled(choice === 'on')}
      />
      <p className={styles.hint}>
        Если приложение сломается, мы получим технический отчёт: что за ошибка, версия приложения,
        устройство и страница. Ваших продуктов, дневника и рецептов в нём нет — так мы быстрее
        находим и исправляем неполадки.
      </p>
    </div>
  );
};
