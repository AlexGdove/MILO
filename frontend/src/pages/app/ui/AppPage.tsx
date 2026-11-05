import { InstallAppCard } from '@/features/install-app';
import { Card, MiloMark, PageLayout } from '@/shared/ui';

import styles from './AppPage.module.css';

/**
 * «Приложение» (решение №28): установка PWA сейчас; ссылки на App Store и Google Play —
 * когда появится мобильное приложение (стек не выбран, см. TASKS «Открытые вопросы»).
 */
export const AppPage = () => (
  <PageLayout title="Приложение">
    <div className={styles.hero}>
      <MiloMark size={64} title="MILO" />
      <p className={styles.lead}>
        MILO работает в браузере и устанавливается на телефон как приложение — с иконкой на главном
        экране и без интернета.
      </p>
    </div>

    <InstallAppCard />

    <Card className={styles.section}>
      <h2 className={styles.title}>Как установить вручную</h2>
      <div className={styles.platform}>
        <h3 className={styles.platformName}>iPhone и iPad</h3>
        <ol className={styles.steps}>
          <li>Откройте MILO в Safari.</li>
          <li>Нажмите «Поделиться» (квадрат со стрелкой).</li>
          <li>Выберите «На экран „Домой“» и нажмите «Добавить».</li>
        </ol>
      </div>
      <div className={styles.platform}>
        <h3 className={styles.platformName}>Android</h3>
        <ol className={styles.steps}>
          <li>Откройте MILO в Chrome.</li>
          <li>Нажмите меню ⋮ в правом верхнем углу.</li>
          <li>Выберите «Установить приложение» или «Добавить на главный экран».</li>
        </ol>
      </div>
    </Card>

    <Card className={styles.section}>
      <h2 className={styles.title}>App Store и Google Play</h2>
      <p className={styles.text}>
        Мобильное приложение MILO для магазинов — в разработке. Когда оно выйдет, ссылки на
        скачивание появятся здесь.
      </p>
      <div className={styles.stores} aria-label="Магазины приложений">
        <span className={styles.store}>App Store · скоро</span>
        <span className={styles.store}>Google Play · скоро</span>
      </div>
    </Card>
  </PageLayout>
);
