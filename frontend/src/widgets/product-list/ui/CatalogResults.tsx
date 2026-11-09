import { type CatalogFood, useCatalogSearch } from '@/entities/food-catalog';
import type { ProductDraft } from '@/entities/product';
import { FoundProductActions } from '@/features/add-found-product';
import { ApiError } from '@/shared/api';

import styles from './CatalogResults.module.css';

const toDraft = (food: CatalogFood): ProductDraft => ({
  name: food.name,
  unit: food.unit,
  per100g: food.per100g,
  stock: 0,
  minStock: 0,
});

interface CatalogResultsProps {
  query: string;
  /** Продукт из каталога добавлен в кладовую или покупки (сбросить поиск) */
  onCreated: () => void;
}

/**
 * «Найдено в Open Food Facts» под своими результатами поиска (решение №53): две кнопки —
 * в кладовую и в покупки (№64): продукт создаётся сразу с заполненным КБЖУ, дальше это обычный свой.
 * Нет сети или сервера — блок молча скрыт; упёрлись в лимит — короткое пояснение.
 */
export const CatalogResults = ({ query, onCreated }: CatalogResultsProps) => {
  const { data, error, isFetching, enabled } = useCatalogSearch(query);
  if (!enabled) return null;

  const busy = error instanceof ApiError && error.code === 'catalog_busy';
  if (error && !busy) return null;

  return (
    <section className={styles.section} aria-label="Найдено в Open Food Facts">
      <h2 className={styles.title}>Найдено в Open Food Facts</h2>
      {busy ? (
        <p className={styles.note}>Слишком много запросов — попробуйте через минуту</p>
      ) : !data ? (
        isFetching && <p className={styles.note}>Ищем…</p>
      ) : data.length === 0 ? (
        <p className={styles.note}>Ничего не нашлось</p>
      ) : (
        <ul className={styles.list}>
          {data.map((food) => (
            <li key={food.code} className={styles.item}>
              <div className={styles.info}>
                <p className={styles.name}>{food.name}</p>
                <p className={styles.meta}>
                  {[
                    `${food.per100g.kcal} ккал на 100 ${food.unit === 'ml' ? 'мл' : 'г'}`,
                    food.brand,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <FoundProductActions draft={toDraft(food)} onAdded={onCreated} />
            </li>
          ))}
        </ul>
      )}
      <p className={styles.attribution}>
        Данные:{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
          Open Food Facts
        </a>{' '}
        (ODbL)
      </p>
    </section>
  );
};
