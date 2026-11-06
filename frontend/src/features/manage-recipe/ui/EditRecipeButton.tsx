import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import { useRecipeStore, type Recipe } from '@/entities/recipe';
import { Button, Modal } from '@/shared/ui';

import { RecipeForm } from './RecipeForm';

interface EditRecipeButtonProps {
  recipe: Recipe;
}

/** Правка рецепта; удаление — отдельной кнопкой `DeleteRecipeButton` (решение №54). */
export const EditRecipeButton = ({ recipe }: EditRecipeButtonProps) => {
  const [open, setOpen] = useState(false);
  const products = useProductStore(selectProducts);
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);

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
        />
      </Modal>
    </>
  );
};
