import { useSearchParams } from 'react-router-dom';

import { AddRecipeButton } from '@/features/manage-recipe';
import { cn } from '@/shared/lib';
import { EmptyState, PageLayout } from '@/shared/ui';
import { ProfileLink } from '@/widgets/profile-link';
import { RecipeList } from '@/widgets/recipe-list';

import styles from './RecipesPage.module.css';

type RecipesTab = 'all' | 'cooked' | 'history';

const TABS: ReadonlyArray<{ value: RecipesTab; label: string }> = [
  { value: 'all', label: 'Рецепты' },
  { value: 'cooked', label: 'Приготовленные' },
  { value: 'history', label: 'История' },
];

const isTab = (value: string | null): value is RecipesTab =>
  TABS.some((tab) => tab.value === value);

/** Раздел «Рецепты» (решение №25). Вкладка хранится в адресе (?tab=), чтобы «назад» возвращал на неё. */
export const RecipesPage = () => {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: RecipesTab = isTab(rawTab) ? rawTab : 'all';

  return (
    <PageLayout title="Рецепты" eyebrow={<ProfileLink />} actions={<AddRecipeButton />}>
      <div className={styles.tabs} role="tablist" aria-label="Раздел рецептов">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={cn(styles.tab, tab === item.value && styles.tabActive)}
            onClick={() =>
              setParams(item.value === 'all' ? {} : { tab: item.value }, { replace: true })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'all' && <RecipeList />}
      {tab === 'cooked' && (
        <EmptyState
          title="Пока ничего не приготовлено"
          description="Здесь появятся готовые блюда с оставшимися порциями"
        />
      )}
      {tab === 'history' && (
        <EmptyState
          title="История пуста"
          description="Здесь будет журнал готовки и съеденного по дням"
        />
      )}
    </PageLayout>
  );
};
