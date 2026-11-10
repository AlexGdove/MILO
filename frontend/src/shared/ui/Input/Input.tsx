import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib';

import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Кнопка справа от поля (например, сканер штрихкода) */
  action?: ReactNode;
}

export const Input = ({ label, error, action, id, className, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const input = (
    <input
      id={inputId}
      className={cn(styles.input, error && styles.invalid)}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );

  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      {action ? (
        <div className={styles.withAction}>
          {input}
          {action}
        </div>
      ) : (
        input
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};
