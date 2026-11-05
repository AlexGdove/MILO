import { Button } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';

interface SelectedSourceProps {
  name: string;
  meta: string;
  onChange: () => void;
}

/** Выбранный продукт, блюдо или рецепт с кнопкой «Изменить» (вернуться к выбору). */
export const SelectedSource = ({ name, meta, onChange }: SelectedSourceProps) => (
  <div className={styles.selected}>
    <div>
      <p className={styles.optionName}>{name}</p>
      <p className={styles.optionMeta}>{meta}</p>
    </div>
    <Button variant="ghost" size="small" onClick={onChange}>
      Изменить
    </Button>
  </div>
);
