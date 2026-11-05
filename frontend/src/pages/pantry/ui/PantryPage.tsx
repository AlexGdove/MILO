import { useSearchParams } from 'react-router-dom';

import { AddProductButton } from '@/features/manage-product';
import { PageLayout, Tabs } from '@/shared/ui';
import { AppLink } from '@/widgets/app-link';
import { ProductList } from '@/widgets/product-list';
import { ShoppingList } from '@/widgets/shopping-list';

type PantryTab = 'pantry' | 'shopping';

/** «Покупки» — вторая вкладка кладовой (решение №28). */
const TABS: ReadonlyArray<{ value: PantryTab; label: string }> = [
  { value: 'pantry', label: 'Кладовая' },
  { value: 'shopping', label: 'Покупки' },
];

/** Кладовая и список покупок. Вкладка хранится в адресе (?tab=shopping). */
export const PantryPage = () => {
  const [params, setParams] = useSearchParams();
  const tab: PantryTab = params.get('tab') === 'shopping' ? 'shopping' : 'pantry';

  return (
    <PageLayout
      title={tab === 'shopping' ? 'Покупки' : 'Кладовая'}
      eyebrow={<AppLink />}
      actions={tab === 'pantry' ? <AddProductButton /> : undefined}
    >
      <Tabs
        label="Кладовая и покупки"
        items={TABS}
        value={tab}
        onChange={(next) => setParams(next === 'pantry' ? {} : { tab: next }, { replace: true })}
      />
      {tab === 'pantry' ? <ProductList /> : <ShoppingList />}
    </PageLayout>
  );
};
