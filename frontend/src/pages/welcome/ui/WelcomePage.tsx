import { useNavigate } from 'react-router-dom';

import { ProfileWizard } from '@/features/edit-profile';
import { ROUTES } from '@/shared/config';
import { MiloMark, PrivacyNotice } from '@/shared/ui';

import styles from './WelcomePage.module.css';

/** Первый запуск (решение №30): приветствие и анкета для расчёта нормы. */
export const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <MiloMark size={56} title="MILO" />
        <h1 className={styles.title}>Добро пожаловать в MILO</h1>
        <p className={styles.lead}>
          Расскажите немного о себе — рассчитаем дневную норму калорий и БЖУ. Данные можно поменять
          в любой момент в «Профиле».
        </p>
        <PrivacyNotice variant="brief" />
      </div>
      <ProfileWizard onFinish={() => navigate(ROUTES.dashboard, { replace: true })} />
    </main>
  );
};
