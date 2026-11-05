import { useMemo } from 'react';

import { CookedDishCard, selectCookedDishes, useCookedDishStore } from '@/entities/cooked-dish';
import { DiscardDishButton, EatPortionButton } from '@/features/eat-dish';
import { EmptyState } from '@/shared/ui';

import styles from './CookedDishes.module.css';

/** «Приготовленные»: блюда, у которых остались порции. */
export const CookedDishes = () => {
  const dishes = useCookedDishStore(selectCookedDishes);
  const available = useMemo(() => dishes.filter((dish) => dish.servingsLeft > 0), [dishes]);

  if (available.length === 0) {
    return (
      <EmptyState
        title="Пока ничего не приготовлено"
        description="Откройте рецепт и нажмите «Приготовить» — блюдо появится здесь с порциями"
      />
    );
  }

  return (
    <ul className={styles.list} aria-label="Приготовленные блюда">
      {available.map((dish) => (
        <li key={dish.id}>
          <CookedDishCard
            dish={dish}
            actions={
              <>
                <EatPortionButton dish={dish} />
                <DiscardDishButton dish={dish} />
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
};
