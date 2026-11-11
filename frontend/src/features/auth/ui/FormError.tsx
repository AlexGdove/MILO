import styles from './AuthForm.module.css';
import { authErrorText } from '../model/authErrorText';

/** Ошибка отправки под формой (нет ошибки — ничего). */
export const FormError = ({ error }: { error: unknown }) =>
  error === null ? null : (
    <p role="alert" className={styles.error}>
      {authErrorText(error)}
    </p>
  );
