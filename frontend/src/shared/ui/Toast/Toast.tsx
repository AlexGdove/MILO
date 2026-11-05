import type { ReactNode } from 'react';

import styles from './Toast.module.css';

interface ToastProps {
  message: ReactNode;
  /** Кнопки действий (например, «В покупки») */
  actions?: ReactNode;
  onClose: () => void;
}

/** Всплывающее сообщение над нижней навигацией. Само не исчезает — закрывается действием или «✕». */
export const Toast = ({ message, actions, onClose }: ToastProps) => (
  <div className={styles.toast} role="status" aria-live="polite">
    <p className={styles.message}>{message}</p>
    {actions}
    <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
      ×
    </button>
  </div>
);
