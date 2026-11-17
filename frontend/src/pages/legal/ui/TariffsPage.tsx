import { Link } from 'react-router-dom';

import { BuyTariff } from '@/features/buy-tariff';
import { ROUTES, TARIFFS } from '@/shared/config';
import { paidFeaturesAvailable } from '@/shared/lib';

import styles from './Legal.module.css';
import { LegalLayout } from './LegalLayout';

/**
 * Тарифы (решение №76, страница — №77): цены только помесячно. Кнопка «Оплатить» (№78) —
 * только там, где платное доступно (не в приложении из App Store).
 */
export const TariffsPage = () => {
  const canBuy = paidFeaturesAvailable();

  return (
    <LegalLayout title="Тарифы">
      <p className={styles.lead}>
        MILO бесплатен: дневник питания, кладовая, покупки, рецепты и расчёт нормы доступны всем без
        аккаунта. Тариф нужен только для распознавания блюд по фото.
      </p>

      <ul className={styles.tariffs}>
        {TARIFFS.map((tariff) => (
          <li key={tariff.id} className={styles.tariff}>
            <h2 className={styles.tariffName}>{tariff.name}</h2>
            <p className={styles.tariffPrice}>
              {tariff.pricePerMonth === 0 ? 'Бесплатно' : `${tariff.pricePerMonth} ₽ в месяц`}
            </p>
            <p className={styles.tariffLimit}>Фото блюда: {tariff.photoLimit}</p>
            {canBuy && tariff.pricePerMonth > 0 && (
              <div className={styles.tariffAction}>
                <BuyTariff tariff={tariff} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className={styles.section}>
        <h2 className={styles.heading}>Оплата</h2>
        <p>
          Только помесячно. Оплата банковской картой или через СБП, платёжный сервис — ЮKassa.
          Автопродление включается только по вашему выбору и отключается в любой момент.
        </p>
        <p>
          Условия — в <Link to={ROUTES.offer}>публичной оферте</Link>. Распознавание выполняет
          нейросеть: калорийность — оценка, проверяйте её перед сохранением.
        </p>
      </section>
    </LegalLayout>
  );
};
