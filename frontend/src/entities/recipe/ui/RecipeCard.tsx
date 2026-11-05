import { Link } from 'react-router-dom';

import { cn, formatKcal } from '@/shared/lib';

import styles from './RecipeCard.module.css';
import { AVAILABILITY_LABEL, type AvailabilityStatus } from '../lib/availability';
import type { Recipe } from '../model/types';

interface RecipeCardProps {
  recipe: Recipe;
  kcalPerServing: number;
  availability: AvailabilityStatus;
  /** Адрес страницы рецепта */
  to: string;
}

export const RecipeCard = ({ recipe, kcalPerServing, availability, to }: RecipeCardProps) => (
  <Link to={to} className={styles.card}>
    <div className={styles.info}>
      <h3 className={styles.name}>{recipe.name}</h3>
      <p className={styles.meta}>
        {recipe.servings} порц. · {recipe.ingredients.length} ингр. · {formatKcal(kcalPerServing)}{' '}
        ккал/порц.
      </p>
    </div>
    <span className={cn(styles.badge, styles[availability])}>
      {AVAILABILITY_LABEL[availability]}
    </span>
  </Link>
);
