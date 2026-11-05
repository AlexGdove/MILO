import { useState } from 'react';

import { useCookedDishStore } from '@/entities/cooked-dish';
import { selectProducts, useProductStore } from '@/entities/product';
import {
  canAddToShopping,
  checkAvailability,
  planCooking,
  type Recipe,
  type ShortageDecision,
} from '@/entities/recipe';
import { useShoppingStore } from '@/entities/shopping-item';
import { cn, formatAmount } from '@/shared/lib';
import { Button, Modal } from '@/shared/ui';

import styles from './CookRecipeButton.module.css';

interface CookRecipeButtonProps {
  recipe: Recipe;
  servings: number;
  /** Вызывается после готовки (например, чтобы открыть «Приготовленные») */
  onCooked?: () => void;
}

interface CookFormProps extends CookRecipeButtonProps {
  onClose: () => void;
}

const CookForm = ({ recipe, servings, onCooked, onClose }: CookFormProps) => {
  const products = useProductStore(selectProducts);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addShoppingItem = useShoppingStore((state) => state.addItem);
  const addDish = useCookedDishStore((state) => state.addDish);
  const [decisions, setDecisions] = useState<Record<string, ShortageDecision>>({});

  const availability = checkAvailability(recipe, products, servings);
  const plan = planCooking(availability, products, decisions);
  const shortages = availability.items.filter((item) => item.shortage > 0);
  const productById = new Map(products.map((product) => [product.id, product]));

  const handleCook = () => {
    if (!plan.canCook) return;
    for (const { productId, amount } of plan.deductions) adjustStock(productId, -amount);
    for (const item of plan.toShopping) addShoppingItem(item);
    addDish({
      recipeId: recipe.id,
      name: recipe.name,
      servingsTotal: servings,
      portionGrams: plan.totalGrams / servings,
      per100g: plan.per100g,
    });
    onClose();
    onCooked?.();
  };

  return (
    <div className={styles.form}>
      {plan.deductions.length > 0 ? (
        <section className={styles.section} aria-labelledby="cook-deduct">
          <h3 id="cook-deduct" className={styles.heading}>
            Спишется из кладовой
          </h3>
          <ul className={styles.list}>
            {plan.deductions.map(({ productId, amount }) => {
              const product = productById.get(productId);
              return (
                <li key={productId}>
                  {product?.name} — {product ? formatAmount(amount, product.unit) : amount}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className={styles.warning}>
          В кладовой нет ни одного ингредиента — готовить не из чего.
        </p>
      )}

      {shortages.length > 0 && (
        <section className={styles.section} aria-labelledby="cook-shortages">
          <h3 id="cook-shortages" className={styles.heading}>
            Не хватает — решите по каждому
          </h3>
          {shortages.map((item) => {
            const label = item.name || 'Удалённый продукт';
            if (!canAddToShopping(item)) {
              return (
                <p key={item.productId} className={styles.shortage}>
                  {label} — готовим без него (
                  {item.productMissing ? 'продукт удалён' : 'сменилась единица'})
                </p>
              );
            }
            const decision = decisions[item.productId];
            return (
              <fieldset key={item.productId} className={styles.shortage}>
                <legend className={styles.shortageName}>
                  {label}: не хватает {formatAmount(item.shortage, item.unit)}
                </legend>
                <div className={styles.choices}>
                  {(
                    [
                      ['shopping', 'В покупки'],
                      ['skip', 'Без него'],
                    ] as const
                  ).map(([value, text]) => (
                    <label
                      key={value}
                      className={cn(styles.choice, decision === value && styles.choiceActive)}
                    >
                      <input
                        type="radio"
                        name={`shortage-${item.productId}`}
                        value={value}
                        checked={decision === value}
                        onChange={() =>
                          setDecisions((current) => ({ ...current, [item.productId]: value }))
                        }
                      />
                      {text}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </section>
      )}

      <Button fullWidth disabled={!plan.canCook} onClick={handleCook}>
        {plan.undecided.length > 0
          ? `Решите по недостающим (${plan.undecided.length})`
          : `Приготовить ${servings} порц.`}
      </Button>
    </div>
  );
};

/** «Приготовить»: списать продукты, по нехваткам — выбор пользователя, получить блюдо с порциями. */
export const CookRecipeButton = (props: CookRecipeButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)}>
        Приготовить
      </Button>
      <Modal
        open={open}
        title={`${props.recipe.name}: ${props.servings} порц.`}
        onClose={() => setOpen(false)}
      >
        <CookForm {...props} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
};
