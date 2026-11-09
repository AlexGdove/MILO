import { useState } from 'react';

import { suggestPurchaseAmount, useProductStore, type ProductDraft } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';
import { AmountForm, Button, Modal } from '@/shared/ui';

import styles from './FoundProductActions.module.css';

interface FoundProductActionsProps {
  /** Найденный продукт: из Open Food Facts или общей базы MILO (КБЖУ уже заполнено) */
  draft: ProductDraft;
  /** Продукт создан и добавлен (например, чтобы сбросить поиск) */
  onAdded?: () => void;
}

type Target = 'pantry' | 'shopping';

/**
 * Найденный продукт сразу в кладовую или в покупки, по выбору (решение №64): указали количество —
 * продукт создаётся со своим КБЖУ и попадает туда, куда выбрали, без промежуточной формы.
 * Изменить продукт можно потом, в карточке кладовой.
 */
export const FoundProductActions = ({ draft, onAdded }: FoundProductActionsProps) => {
  const [target, setTarget] = useState<Target | null>(null);
  const addProduct = useProductStore((state) => state.addProduct);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addShoppingItem = useShoppingStore((state) => state.addItem);

  const close = () => setTarget(null);
  const initialAmount = suggestPurchaseAmount({ stock: 0, minStock: 0, unit: draft.unit });

  const submit = (amount: number) => {
    const product = addProduct({ ...draft, stock: 0 });
    if (target === 'pantry') {
      adjustStock(product.id, amount);
    } else {
      addShoppingItem({ productId: product.id, name: product.name, amount, unit: product.unit });
    }
    close();
    onAdded?.();
  };

  return (
    <>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setTarget('pantry')}
          aria-label={`${draft.name}: в кладовую`}
        >
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setTarget('shopping')}
          aria-label={`${draft.name}: в покупки`}
        >
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2" />
            <circle cx="10" cy="20" r="1.25" />
            <circle cx="17" cy="20" r="1.25" />
          </svg>
        </Button>
      </div>
      {/* Окно существует, только пока открыто: иначе название продукта дублируется в списке */}
      {target !== null && (
        <Modal open title={draft.name} onClose={close}>
          <AmountForm
            label={target === 'shopping' ? 'Сколько купить' : 'Сколько добавить'}
            unit={draft.unit}
            initialAmount={initialAmount}
            submitLabel={target === 'shopping' ? 'В список покупок' : 'В кладовую'}
            hints={<p>Продукт появится в вашем списке с этим КБЖУ — позже его можно изменить.</p>}
            onSubmit={submit}
          />
        </Modal>
      )}
    </>
  );
};
