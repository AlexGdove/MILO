import { cn } from '@/shared/lib';

import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

/** Заглушка на время загрузки. Скрыта от скринридеров. */
export const Skeleton = ({
  width = '100%',
  height = '1em',
  radius = 'md',
  className,
}: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={cn(styles.skeleton, styles[radius], className)}
    style={{ width, height }}
  />
);
