import { useState } from 'react';

import { useRecipeStore, type Recipe } from '@/entities/recipe';
import { Button, Modal } from '@/shared/ui';

import styles from './DeleteRecipeButton.module.css';

interface DeleteRecipeButtonProps {
  recipe: Recipe;
  /** После удаления (например, уйти со страницы рецепта) */
  onDeleted?: () => void;
}

/**
 * Удаление рецепта в два нажатия (решение №54): корзина рядом с «Изменить» → своё окно
 * подтверждения (не системное `confirm`). Приготовленные блюда и история не трогаются.
 */
export const DeleteRecipeButton = ({ recipe, onDeleted }: DeleteRecipeButtonProps) => {
  const [open, setOpen] = useState(false);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Удалить рецепт"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      </button>
      <Modal open={open} title="Удалить рецепт?" onClose={() => setOpen(false)}>
        <p className={styles.text}>
          «{recipe.name}» удалится с этого устройства. Приготовленные блюда и история останутся.
        </p>
        <div className={styles.actions}>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              removeRecipe(recipe.id);
              setOpen(false);
              onDeleted?.();
            }}
          >
            Удалить
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
      </Modal>
    </>
  );
};
