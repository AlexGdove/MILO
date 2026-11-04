import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib';

import styles from './Card.module.css';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(styles.card, className)} {...props} />
);
