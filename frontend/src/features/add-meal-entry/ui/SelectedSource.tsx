import { Button } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';

interface SelectedSourceProps {
  name: string;
  meta: string;
  /** Подпись кнопки возврата к выбору: «← Другой продукт», «← Другое блюдо», … */
  changeLabel: string;
  onChange: () => void;
}

/** Выбранный продукт, блюдо или рецепт с кнопкой возврата к выбору (тот же поиск). */
export const SelectedSource = ({ name, meta, changeLabel, onChange }: SelectedSourceProps) => (
  <div className={styles.selected}>
    <div>
      <p className={styles.optionName}>{name}</p>
      <p className={styles.optionMeta}>{meta}</p>
    </div>
    <Button variant="ghost" size="small" onClick={onChange}>
      {changeLabel}
    </Button>
  </div>
);
