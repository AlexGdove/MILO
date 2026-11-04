import { useId, type InputHTMLAttributes } from 'react';

import { cn } from '@/shared/lib';

import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, id, className, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(styles.input, error && styles.invalid)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};
