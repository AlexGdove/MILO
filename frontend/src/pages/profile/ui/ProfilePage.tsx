import { DailyGoalForm } from '@/features/set-daily-goal';
import { Card, PageLayout } from '@/shared/ui';

import styles from './ProfilePage.module.css';

/** Профиль — вкладка нижней навигации (решение №28); установка приложения — на странице «Приложение». */
export const ProfilePage = () => (
  <PageLayout title="Профиль">
    <Card className={styles.section}>
      <h2 className={styles.title}>Дневная цель</h2>
      <DailyGoalForm />
    </Card>
  </PageLayout>
);
