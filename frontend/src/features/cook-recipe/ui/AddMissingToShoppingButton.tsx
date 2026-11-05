import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import { checkAvailability, type Recipe } from '@/entities/recipe';
import { useShoppingStore } from '@/entities/shopping-item';
import { Button } from '@/shared/ui';

import { canAddToShopping } from '../lib/planCooking';

interface AddMissingToShoppingButtonProps {
  recipe: Recipe;
  servings: number;
}

/** «Недостающее — в покупки»: только по нажатию пользователя, на выбранное число порций. */
export const AddMissingToShoppingButton = ({
  recipe,
  servings,
}: AddMissingToShoppingButtonProps) => {
  const products = useProductStore(selectProducts);
  const addItem = useShoppingStore((state) => state.addItem);
  const [added, setAdded] = useState<number | null>(null);

  const missing = checkAvailability(recipe, products, servings).items.filter(
    (item) => item.shortage > 0 && canAddToShopping(item),
  );

  if (added !== null) {
    return (
      <p role="status" aria-live="polite">
        Добавлено в покупки: {added}
      </p>
    );
  }

  return (
    <Button
      variant="secondary"
      fullWidth
      disabled={missing.length === 0}
      onClick={() => {
        for (const item of missing) {
          addItem({
            productId: item.productId,
            name: item.name,
            amount: item.shortage,
            unit: item.unit,
          });
        }
        setAdded(missing.length);
      }}
    >
      {missing.length > 0 ? `Недостающее — в покупки (${missing.length})` : 'Всего хватает'}
    </Button>
  );
};
