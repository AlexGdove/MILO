import { SELLER, sellerValue } from '@/shared/config';

import styles from './Legal.module.css';
import { LegalLayout } from './LegalLayout';

/** Реквизиты продавца и контакты (решение №77) — их проверяет ЮKassa при подключении. */
export const RequisitesPage = () => {
  const rows = [
    { label: 'Продавец', value: sellerValue(SELLER.fullName) },
    { label: 'Статус', value: SELLER.status },
    { label: 'ИНН', value: sellerValue(SELLER.inn) },
    ...(SELLER.email
      ? [{ label: 'Почта для обращений', value: SELLER.email, href: `mailto:${SELLER.email}` }]
      : []),
    {
      label: 'Телефон',
      value: sellerValue(SELLER.phone),
      href: SELLER.phone && `tel:${SELLER.phone.replace(/[^\d+]/g, '')}`,
    },
    { label: 'Сайт', value: SELLER.site },
  ];

  return (
    <LegalLayout title="Реквизиты и контакты">
      <dl className={styles.requisites}>
        {rows.map((row) => (
          <div key={row.label} className={styles.requisite}>
            <dt>{row.label}</dt>
            <dd>{row.href ? <a href={row.href}>{row.value}</a> : row.value}</dd>
          </div>
        ))}
      </dl>
      <section className={styles.section}>
        <h2 className={styles.heading}>Как с нами связаться</h2>
        <p>
          Вопросы об оплате, возврате и работе сервиса — по телефону выше или через «Настройки →
          Техподдержка» в приложении.
        </p>
      </section>
    </LegalLayout>
  );
};
