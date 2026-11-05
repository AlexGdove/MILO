import { dailyNorm, type UserProfile } from '@/entities/user-profile';
import { formatKcal } from '@/shared/lib';

import styles from './ProfileForm.module.css';

interface NormPreviewProps {
  profile: UserProfile | null;
}

/** Норма по профилю «на лету» — пока поля заполняются. */
export const NormPreview = ({ profile }: NormPreviewProps) => {
  if (!profile) {
    return <p className={styles.previewEmpty}>Заполните данные — MILO рассчитает дневную норму</p>;
  }
  const norm = dailyNorm(profile);
  return (
    <div className={styles.preview} aria-live="polite">
      <p className={styles.previewKcal}>
        <span className={styles.previewValue}>{formatKcal(norm.kcal)}</span> ккал в день
      </p>
      <p className={styles.previewMacros}>
        Б {norm.protein} г · Ж {norm.fat} г · У {norm.carbs} г
      </p>
      <p className={styles.previewNote}>
        Формула Миффлина — Сан Жеора с учётом активности и цели. Это ориентир, а не рекомендация
        врача.
      </p>
    </div>
  );
};
