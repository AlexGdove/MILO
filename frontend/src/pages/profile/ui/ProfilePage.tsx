import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useDailyGoal, useGoalMode } from '@/entities/user-goal';
import { describeProfile, selectProfile, useUserProfileStore } from '@/entities/user-profile';
import { ProfileForm, useApplyProfileNorm } from '@/features/edit-profile';
import { DailyGoalForm } from '@/features/set-daily-goal';
import { ROUTES } from '@/shared/config';
import { formatKcal } from '@/shared/lib';
import { Button, Card, Collapsible, PageLayout } from '@/shared/ui';

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

/** Небольшая кнопка-шестерёнка: настройки (оформление, язык, техподдержка — решение №43). */
const SettingsLink = () => (
  <Link to={ROUTES.settings} className={styles.settings} aria-label="Настройки">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  </Link>
);

/**
 * Профиль — вкладка нижней навигации (решение №28); данные и норма — решение №30.
 * «Мои данные» — аккордеон (решение №33): заполненный профиль свёрнут до краткой сводки.
 * Оформление перенесено в «Настройки» (решение №43).
 */
export const ProfilePage = () => {
  const profile = useUserProfileStore(selectProfile);

  return (
    <PageLayout title="Профиль" actions={<SettingsLink />}>
      <Collapsible
        title="Мои данные"
        summary={profile ? describeProfile(profile) : 'Не заполнено'}
        defaultOpen={!profile}
      >
        <ProfileForm />
      </Collapsible>
      <NormSection />
    </PageLayout>
  );
};
