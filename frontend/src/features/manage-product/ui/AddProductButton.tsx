import { useState } from 'react';

import { useProductStore } from '@/entities/product';
import { Button, Modal } from '@/shared/ui';

import { ProductForm } from './ProductForm';

export const AddProductButton = () => {
  const [open, setOpen] = useState(false);
  const addProduct = useProductStore((state) => state.addProduct);

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        + Продукт
      </Button>
      <Modal open={open} title="Новый продукт" onClose={() => setOpen(false)}>
        <ProductForm
          submitLabel="Добавить"
          onSubmit={(draft) => {
            addProduct(draft);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
};
