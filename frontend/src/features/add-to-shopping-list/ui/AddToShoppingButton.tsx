import { useState } from 'react';

import { suggestPurchaseAmount, type Product } from '@/entities/product';
import { selectShoppingItemByProductId, useShoppingStore } from '@/entities/shopping-item';
import { formatAmount } from '@/shared/lib';
import { AmountForm, Button, Modal } from '@/shared/ui';

import styles from './AddToShoppingButton.module.css';

interface AddToShoppingButtonProps {
  product: Product;
  /** Компактная иконка (в карточке кладовой) или кнопка с подписью (в подсказках) */
  compact?: boolean;
}

export const AddToShoppingButton = ({ product, compact = false }: AddToShoppingButtonProps) => {
  const [open, setOpen] = useState(false);
  const addItem = useShoppingStore((state) => state.addItem);
  const inList = useShoppingStore(selectShoppingItemByProductId(product.id));
  // Количество в списке показываем, только если оно в той же единице, что и продукт
  const inListAmount = inList && inList.unit === product.unit ? inList.amount : undefined;

  return (
    <>
      {compact ? (
        <Button
          variant={inList ? 'ghost' : 'secondary'}
          size="small"
          onClick={() => setOpen(true)}
          aria-label={
            inList ? `${product.name}: уже в покупках, добавить ещё` : `${product.name}: в покупки`
          }
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
            {inList && <path d="M10.5 11l2 2 3.5-3.5" />}
          </svg>
        </Button>
      ) : (
        <Button size="small" onClick={() => setOpen(true)}>
          В покупки
        </Button>
      )}
      <Modal open={open} title={product.name} onClose={() => setOpen(false)}>
        <AmountForm
          label="Сколько купить"
          unit={product.unit}
          initialAmount={suggestPurchaseAmount(product)}
          submitLabel="В список покупок"
          hints={
            <>
              <p>
                В кладовой: {formatAmount(product.stock, product.unit)}
                {product.minStock > 0 &&
                  ` · минимум ${formatAmount(product.minStock, product.unit)}`}
              </p>
              {inListAmount !== undefined && (
                <p>
                  Уже в списке: {formatAmount(inListAmount, product.unit)} — количество добавится
                </p>
              )}
            </>
          }
          onSubmit={(amount) => {
            addItem({ productId: product.id, name: product.name, amount, unit: product.unit });
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
};
