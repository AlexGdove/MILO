import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import { useRecipeStore, type Recipe } from '@/entities/recipe';
import { Button, Modal } from '@/shared/ui';

import { RecipeForm } from './RecipeForm';

interface AddRecipeButtonProps {
  label?: string;
  /** Вызывается после создания (например, чтобы открыть страницу рецепта) */
  onCreated?: (recipe: Recipe) => void;
}

export const AddRecipeButton = ({ label = '+ Рецепт', onCreated }: AddRecipeButtonProps) => {
  const [open, setOpen] = useState(false);
  const products = useProductStore(selectProducts);
  const addRecipe = useRecipeStore((state) => state.addRecipe);

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} title="Новый рецепт" onClose={() => setOpen(false)}>
        <RecipeForm
          products={products}
          submitLabel="Создать"
          onSubmit={(draft) => {
            const recipe = addRecipe(draft);
            setOpen(false);
            onCreated?.(recipe);
          }}
        />
      </Modal>
    </>
  );
};
