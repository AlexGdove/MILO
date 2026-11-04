import { InstallAppCard } from '@/features/install-app';
import { DailyGoalForm } from '@/features/set-daily-goal';
import { Card, PageLayout } from '@/shared/ui';

import styles from './ProfilePage.module.css';

export const ProfilePage = () => (
  <PageLayout title="Профиль">
    <Card className={styles.section}>
      <h2 className={styles.title}>Дневная цель</h2>
      <DailyGoalForm />
    </Card>
    <InstallAppCard />
  </PageLayout>
);
