import { type ReactNode, useState } from 'react';

import { useProductStore, type Product } from '@/entities/product';
import { Button, Modal } from '@/shared/ui';

import { ProductForm } from './ProductForm';

interface EditProductButtonProps {
  product: Product;
  /** Дополнительный блок под формой (например, «Предложить в общую базу» из виджета) */
  extra?: ReactNode;
}

export const EditProductButton = ({ product, extra }: EditProductButtonProps) => {
  const [open, setOpen] = useState(false);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const removeProduct = useProductStore((state) => state.removeProduct);

  const handleDelete = () => {
    if (window.confirm(`Удалить «${product.name}»?`)) {
      removeProduct(product.id);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setOpen(true)}
        aria-label={`Изменить ${product.name}`}
      >
        ✎
      </Button>
      <Modal open={open} title="Изменить продукт" onClose={() => setOpen(false)}>
        <ProductForm
          initial={product}
          submitLabel="Сохранить"
          onSubmit={(draft) => {
            updateProduct(product.id, draft);
            setOpen(false);
          }}
          onDelete={handleDelete}
        />
        {extra}
      </Modal>
    </>
  );
};
