import { DateSwitcher, useSelectedDate } from '@/features/select-date';
import { PageLayout } from '@/shared/ui';
import { MealList } from '@/widgets/meal-list';
import { ProfileLink } from '@/widgets/profile-link';

export const DiaryPage = () => {
  const date = useSelectedDate();

  return (
    <PageLayout title="Дневник" eyebrow={<ProfileLink />} actions={<DateSwitcher />}>
      <MealList date={date} />
    </PageLayout>
  );
};
