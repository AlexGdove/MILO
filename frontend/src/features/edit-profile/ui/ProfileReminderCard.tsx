import { Link } from 'react-router-dom';

import { useUserProfileStore } from '@/entities/user-profile';
import { ROUTES } from '@/shared/config';
import { Card } from '@/shared/ui';

import styles from './ProfileForm.module.css';

/** Напоминание на «Сегодня», если анкету отложили («Позже») и профиль не заполнен. */
export const ProfileReminderCard = () => {
  const profile = useUserProfileStore((state) => state.profile);
  if (profile) return null;

  return (
    <Card className={styles.reminder}>
      <p className={styles.reminderTitle}>Заполните профиль</p>
      <p className={styles.reminderText}>
        Пол, возраст, рост, вес, активность и цель — и MILO рассчитает вашу дневную норму.
      </p>
      <Link to={ROUTES.profile} className={styles.reminderLink}>
        Заполнить →
      </Link>
    </Card>
  );
};
