import { Link, useNavigate, useParams } from 'react-router-dom';

import { selectRecipeById, useRecipeStore } from '@/entities/recipe';
import { EditRecipeButton } from '@/features/manage-recipe';
import { ROUTES } from '@/shared/config';
import { EmptyState, PageLayout } from '@/shared/ui';
import { RecipeDetails } from '@/widgets/recipe-details';

import styles from './RecipePage.module.css';

const BackLink = () => (
  <Link to={ROUTES.recipes} className={styles.back}>
    ← Рецепты
  </Link>
);

export const RecipePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = useRecipeStore(selectRecipeById(id));

  if (!recipe) {
    return (
      <PageLayout title="Рецепт" eyebrow={<BackLink />}>
        <EmptyState title="Рецепт не найден" description="Возможно, он был удалён" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={recipe.name}
      eyebrow={<BackLink />}
      actions={
        <EditRecipeButton
          recipe={recipe}
          onDeleted={() => navigate(ROUTES.recipes, { replace: true })}
        />
      }
    >
      {/* key: после правки рецепта выбор порций начинается с его нового значения */}
      <RecipeDetails key={`${recipe.id}:${recipe.servings}`} recipe={recipe} />
    </PageLayout>
  );
};
