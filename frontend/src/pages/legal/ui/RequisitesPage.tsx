import { SELLER, sellerValue } from '@/shared/config';

import styles from './Legal.module.css';
import { LegalLayout } from './LegalLayout';

/** Реквизиты продавца и контакты (решение №77) — их проверяет ЮKassa при подключении. */
export const RequisitesPage = () => {
  const rows = [
    { label: 'Продавец', value: sellerValue(SELLER.fullName) },
    { label: 'Статус', value: SELLER.status },
    { label: 'ИНН', value: sellerValue(SELLER.inn) },
    { label: 'Почта для обращений', value: sellerValue(SELLER.email), mail: SELLER.email },
    { label: 'Сайт', value: SELLER.site },
  ];

  return (
    <LegalLayout title="Реквизиты и контакты">
      <dl className={styles.requisites}>
        {rows.map((row) => (
          <div key={row.label} className={styles.requisite}>
            <dt>{row.label}</dt>
            <dd>{row.mail ? <a href={`mailto:${row.mail}`}>{row.value}</a> : row.value}</dd>
          </div>
        ))}
      </dl>
      <section className={styles.section}>
        <h2 className={styles.heading}>Как с нами связаться</h2>
        <p>
          Вопросы об оплате, возврате и работе сервиса — на почту выше или через «Настройки →
          Техподдержка» в приложении.
        </p>
      </section>
    </LegalLayout>
  );
};
