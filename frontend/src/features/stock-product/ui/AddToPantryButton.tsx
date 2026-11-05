import { useState } from 'react';

import { suggestPurchaseAmount, useProductStore, type Product } from '@/entities/product';
import { formatAmount } from '@/shared/lib';
import { AmountForm, Button, Modal } from '@/shared/ui';

import styles from './AddToPantryButton.module.css';

interface AddToPantryButtonProps {
  product: Product;
}

/** «В кладовую»: прибавить купленное или найденное дома количество к остатку продукта. */
export const AddToPantryButton = ({ product }: AddToPantryButtonProps) => {
  const [open, setOpen] = useState(false);
  const adjustStock = useProductStore((state) => state.adjustStock);

  return (
    <>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setOpen(true)}
        aria-label={`${product.name}: в кладовую`}
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
      <Modal open={open} title={product.name} onClose={() => setOpen(false)}>
        <AmountForm
          label="Сколько добавить"
          unit={product.unit}
          initialAmount={suggestPurchaseAmount(product)}
          submitLabel="В кладовую"
          hints={<p>Сейчас в кладовой: {formatAmount(product.stock, product.unit)}</p>}
          onSubmit={(amount) => {
            adjustStock(product.id, amount);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
};
