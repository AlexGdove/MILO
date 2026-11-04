import { suggestMealType } from '@/entities/meal-entry';
import { AddMealEntryButton } from '@/features/add-meal-entry';
import { DateSwitcher, useSelectedDate } from '@/features/select-date';
import { PageLayout } from '@/shared/ui';
import { DailySummary } from '@/widgets/daily-summary';
import { MealList } from '@/widgets/meal-list';

export const DashboardPage = () => {
  const date = useSelectedDate();

  return (
    <PageLayout title="Калории" actions={<DateSwitcher />}>
      <DailySummary date={date} />
      <AddMealEntryButton
        date={date}
        mealType={suggestMealType()}
        label="+ Добавить еду"
        fullWidth
      />
      <MealList date={date} />
    </PageLayout>
  );
};
