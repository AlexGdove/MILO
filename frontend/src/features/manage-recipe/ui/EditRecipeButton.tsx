import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import { useRecipeStore, type Recipe } from '@/entities/recipe';
import { Button, Modal } from '@/shared/ui';

import { RecipeForm } from './RecipeForm';

interface EditRecipeButtonProps {
  recipe: Recipe;
  /** Вызывается после удаления (например, чтобы уйти со страницы рецепта) */
  onDeleted?: () => void;
}

export const EditRecipeButton = ({ recipe, onDeleted }: EditRecipeButtonProps) => {
  const [open, setOpen] = useState(false);
  const products = useProductStore(selectProducts);
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);

  const handleDelete = () => {
    if (window.confirm(`Удалить рецепт «${recipe.name}»?`)) {
      removeRecipe(recipe.id);
      setOpen(false);
      onDeleted?.();
    }
  };

  return (
    <>
      <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
        Изменить
      </Button>
      <Modal open={open} title="Изменить рецепт" onClose={() => setOpen(false)}>
        <RecipeForm
          products={products}
          initial={recipe}
          submitLabel="Сохранить"
          onSubmit={(draft) => {
            updateRecipe(recipe.id, draft);
            setOpen(false);
          }}
          onDelete={handleDelete}
        />
      </Modal>
    </>
  );
};
