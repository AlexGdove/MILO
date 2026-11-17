import { useId, useState } from 'react';
import { Link } from 'react-router-dom';

import { selectAccount, useSessionStore } from '@/entities/account';
import { accountPath, ROUTES, type Tariff } from '@/shared/config';
import { Button, Modal } from '@/shared/ui';

import styles from './BuyTariff.module.css';

interface BuyTariffProps {
  tariff: Tariff;
}

/**
 * Оформление тарифа на сайте (решение №78): кнопка «Оплатить» → окно с тарифом, ценой,
 * аккаунтом и согласием с офертой. Платёж ЮKassa подключается после одобрения магазина —
 * до этого окно честно сообщает, что оплата пока недоступна.
 */
export const BuyTariff = ({ tariff }: BuyTariffProps) => {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const account = useSessionStore(selectAccount);
  const agreeId = useId();

  const close = () => {
    setOpen(false);
    setAgreed(false);
    setUnavailable(false);
  };

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)}>
        Оплатить
      </Button>
      <Modal open={open} title={`Тариф ${tariff.name}`} onClose={close}>
        <div className={styles.checkout}>
          <dl className={styles.summary}>
            <div className={styles.row}>
              <dt>Тариф</dt>
              <dd>{tariff.name}</dd>
            </div>
            <div className={styles.row}>
              <dt>Фото блюда</dt>
              <dd>{tariff.photoLimit}</dd>
            </div>
            <div className={styles.row}>
              <dt>Срок</dt>
              <dd>1 месяц, без автопродления</dd>
            </div>
            <div className={styles.row}>
              <dt>К оплате</dt>
              <dd className={styles.total}>{tariff.pricePerMonth} ₽</dd>
            </div>
          </dl>

          <p className={styles.account}>
            {account ? (
              <>Тариф подключится к аккаунту {account.email}.</>
            ) : (
              <>
                Тариф подключается к аккаунту MILO —{' '}
                <Link to={accountPath()}>войдите или зарегистрируйтесь</Link>.
              </>
            )}
          </p>

          <label className={styles.agree} htmlFor={agreeId}>
            <input
              id={agreeId}
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>
              Принимаю условия <Link to={ROUTES.offer}>публичной оферты</Link>
            </span>
          </label>

          <Button fullWidth disabled={!agreed} onClick={() => setUnavailable(true)}>
            Оплатить {tariff.pricePerMonth} ₽
          </Button>
          <p className={styles.note}>Оплата картой или через СБП, платёжный сервис — ЮKassa.</p>

          {unavailable && (
            <p role="status" className={styles.status}>
              Приём оплаты подключается — скоро здесь можно будет оплатить тариф. Пока по вопросам
              оплаты — контакты в разделе «<Link to={ROUTES.requisites}>Реквизиты и контакты</Link>
              ».
            </p>
          )}
        </div>
      </Modal>
    </>
  );
};
