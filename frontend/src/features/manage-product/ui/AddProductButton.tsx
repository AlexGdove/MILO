import { useState } from 'react';

import { useProductStore } from '@/entities/product';
import { Button, Modal } from '@/shared/ui';

import { ProductForm } from './ProductForm';

interface AddProductButtonProps {
  /** Название, подставляемое в форму (например, из строки поиска) */
  initialName?: string;
  label?: string;
  /** Продукт создан (например, чтобы сбросить поиск) */
  onCreated?: () => void;
}

export const AddProductButton = ({
  initialName,
  label = '+ Продукт',
  onCreated,
}: AddProductButtonProps) => {
  const [open, setOpen] = useState(false);
  const addProduct = useProductStore((state) => state.addProduct);

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} title="Новый продукт" onClose={() => setOpen(false)}>
        <ProductForm
          submitLabel="Добавить"
          defaultName={initialName?.trim()}
          onSubmit={(draft) => {
            addProduct(draft);
            setOpen(false);
            onCreated?.();
          }}
        />
      </Modal>
    </>
  );
};
