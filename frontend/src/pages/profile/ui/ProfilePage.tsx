import { useState } from 'react';

import { useDailyGoal, useGoalMode } from '@/entities/user-goal';
import { ProfileForm, useApplyProfileNorm } from '@/features/edit-profile';
import { DailyGoalForm } from '@/features/set-daily-goal';
import { formatKcal } from '@/shared/lib';
import { Button, Card, PageLayout } from '@/shared/ui';

import styles from './ProfilePage.module.css';

/** Норма: по профилю (с переходом к своей) или своя (с возвратом к расчёту по профилю). */
const NormSection = () => {
  const goal = useDailyGoal();
  const mode = useGoalMode();
  const applyProfileNorm = useApplyProfileNorm();
  const [editing, setEditing] = useState(false);

  if (mode === 'auto' && !editing) {
    return (
      <Card className={styles.section}>
        <h2 className={styles.title}>Дневная норма</h2>
        <p className={styles.norm}>
          <span className={styles.normValue}>{formatKcal(goal.kcal)}</span> ккал · Б {goal.protein}{' '}
          · Ж {goal.fat} · У {goal.carbs} г
        </p>
        <p className={styles.hint}>
          {applyProfileNorm
            ? 'Рассчитана по профилю и обновляется при его изменении.'
            : 'Пока по умолчанию — заполните профиль выше, и норма рассчитается.'}
        </p>
        <Button variant="secondary" fullWidth onClick={() => setEditing(true)}>
          Задать свою норму
        </Button>
      </Card>
    );
  }

  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>Своя норма</h2>
      <DailyGoalForm />
      {applyProfileNorm ? (
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            applyProfileNorm();
            setEditing(false);
          }}
        >
          Считать по профилю
        </Button>
      ) : (
        <p className={styles.hint}>Заполните профиль, чтобы считать норму автоматически.</p>
      )}
    </Card>
  );
};

/** Профиль — вкладка нижней навигации (решение №28); данные и норма — решение №30. */
export const ProfilePage = () => (
  <PageLayout title="Профиль">
    <Card className={styles.section}>
      <h2 className={styles.title}>Мои данные</h2>
      <ProfileForm />
    </Card>
    <NormSection />
  </PageLayout>
);
