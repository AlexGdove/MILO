import { AddProductButton } from '@/features/manage-product';
import { PageLayout } from '@/shared/ui';
import { ProductList } from '@/widgets/product-list';

export const ProductsPage = () => (
  <PageLayout title="Продукты" actions={<AddProductButton />}>
    <ProductList />
  </PageLayout>
);
