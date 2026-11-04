import { AddProductButton } from '@/features/manage-product';
import { PageLayout } from '@/shared/ui';
import { ProductList } from '@/widgets/product-list';

export const PantryPage = () => (
  <PageLayout title="Кладовая" actions={<AddProductButton />}>
    <ProductList />
  </PageLayout>
);
