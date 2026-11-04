import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib';

import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'medium' | 'small';
  fullWidth?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      styles.button,
      styles[variant],
      size === 'small' && styles.small,
      fullWidth && styles.fullWidth,
      className,
    )}
    {...props}
  />
);
