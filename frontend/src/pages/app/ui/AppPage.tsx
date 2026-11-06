import { InstallAppCard } from '@/features/install-app';
import { ANDROID_APK_URL } from '@/shared/config';
import { isNativeApp } from '@/shared/lib';
import { Card, MiloMark, PageLayout } from '@/shared/ui';

import styles from './AppPage.module.css';

/**
 * «Приложение» (решение №28): установка PWA; Android-приложение — файл APK последней сборки
 * (решение №46); App Store и Google Play — позже. В самом Android-приложении кнопки APK нет.
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
      <h2 className={styles.title}>Приложение для телефона</h2>
      {!isNativeApp() && (
        <>
          <a className={styles.download} href={ANDROID_APK_URL} download="milo.apk">
            Скачать для Android (APK)
          </a>
          <p className={styles.text}>
            Откройте скачанный файл и разрешите установку из этого источника — Android спросит один
            раз. Это последняя сборка; в магазинах приложение появится позже.
          </p>
        </>
      )}
      <div className={styles.stores} aria-label="Магазины приложений">
        <span className={styles.store}>App Store · скоро</span>
        <span className={styles.store}>Google Play · скоро</span>
      </div>
    </Card>
  </PageLayout>
);
