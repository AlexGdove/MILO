import { AddProductButton } from '@/features/manage-product';
import { PageLayout } from '@/shared/ui';
import { ProductList } from '@/widgets/product-list';
import { ProfileLink } from '@/widgets/profile-link';

export const PantryPage = () => (
  <PageLayout title="Кладовая" eyebrow={<ProfileLink />} actions={<AddProductButton />}>
    <ProductList />
  </PageLayout>
);
