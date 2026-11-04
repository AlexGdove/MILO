import { DateSwitcher, useSelectedDate } from '@/features/select-date';
import { PageLayout } from '@/shared/ui';
import { MealList } from '@/widgets/meal-list';

export const DiaryPage = () => {
  const date = useSelectedDate();

  return (
    <PageLayout title="Дневник" actions={<DateSwitcher />}>
      <MealList date={date} />
    </PageLayout>
  );
};
