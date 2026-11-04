import { Button, Card } from '@/shared/ui';

import styles from './InstallAppCard.module.css';
import { useInstallPrompt } from '../model/useInstallPrompt';

export const InstallAppCard = () => {
  const { canInstall, installed, isIos, install } = useInstallPrompt();

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Приложение</h2>
      {installed ? (
        <p className={styles.text}>Приложение установлено на устройство ✓</p>
      ) : canInstall ? (
        <>
          <p className={styles.text}>
            Установите приложение на главный экран — оно работает без интернета.
          </p>
          <Button fullWidth onClick={() => void install()}>
            Установить приложение
          </Button>
        </>
      ) : isIos ? (
        <p className={styles.text}>
          Чтобы установить: нажмите «Поделиться» в Safari и выберите «На экран „Домой“».
        </p>
      ) : (
        <p className={styles.text}>
          Установить можно через меню браузера → «Установить приложение» / «Добавить на главный
          экран».
        </p>
      )}
    </Card>
  );
};
