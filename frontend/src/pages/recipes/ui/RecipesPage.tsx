import { useSearchParams } from 'react-router-dom';

import { AddRecipeButton } from '@/features/manage-recipe';
import { PageLayout, Tabs } from '@/shared/ui';
import { AppLink } from '@/widgets/app-link';
import { CookedDishes } from '@/widgets/cooked-dishes';
import { CookingHistory } from '@/widgets/cooking-history';
import { RecipeList } from '@/widgets/recipe-list';

type RecipesTab = 'all' | 'cooked' | 'history';

/** Три вкладки — выбор пользователя по скриншотам (решение №25). */
const TABS: ReadonlyArray<{ value: RecipesTab; label: string }> = [
  { value: 'all', label: 'Рецепты' },
  { value: 'cooked', label: 'Приготовленные' },
  { value: 'history', label: 'История' },
];

const isTab = (value: string | null): value is RecipesTab =>
  TABS.some((tab) => tab.value === value);

/** Раздел «Рецепты». Вкладка хранится в адресе (?tab=), чтобы «назад» возвращал на неё. */
export const RecipesPage = () => {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: RecipesTab = isTab(rawTab) ? rawTab : 'all';

  return (
    <PageLayout title="Рецепты" eyebrow={<AppLink />} actions={<AddRecipeButton />}>
      <Tabs
        label="Раздел рецептов"
        items={TABS}
        value={tab}
        onChange={(next) => setParams(next === 'all' ? {} : { tab: next }, { replace: true })}
      />
      {tab === 'all' && <RecipeList />}
      {tab === 'cooked' && <CookedDishes />}
      {tab === 'history' && <CookingHistory />}
    </PageLayout>
  );
};
