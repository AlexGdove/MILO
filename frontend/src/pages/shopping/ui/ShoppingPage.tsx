import { PageLayout } from '@/shared/ui';
import { ProfileLink } from '@/widgets/profile-link';
import { ShoppingList } from '@/widgets/shopping-list';

export const ShoppingPage = () => (
  <PageLayout title="Покупки" eyebrow={<ProfileLink />}>
    <ShoppingList />
  </PageLayout>
);
