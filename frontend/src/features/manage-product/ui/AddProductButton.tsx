import { useState } from 'react';

import { useProductStore, type ProductDraft } from '@/entities/product';
import { Button, Modal } from '@/shared/ui';

import { ProductForm } from './ProductForm';

interface AddProductButtonProps {
  /** Название, подставляемое в форму (например, из строки поиска) */
  initialName?: string;
  /** Штрихкод, подставляемый в форму (например, отсканированный в поиске) */
  initialBarcode?: string;
  /** Заполненная форма (например, продукт из Open Food Facts) */
  initialDraft?: ProductDraft;
  label?: string;
  /** Продукт создан (например, чтобы сбросить поиск) */
  onCreated?: () => void;
}

export const AddProductButton = ({
  initialName,
  initialBarcode,
  initialDraft,
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
          initial={initialDraft}
          defaultName={initialName?.trim()}
          defaultBarcode={initialBarcode}
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
