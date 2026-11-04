import type { ReactNode } from 'react';

import { cn } from '@/shared/lib';

import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  /** Доля от 0 до 1; больше 1 — превышение (кольцо красное). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}

export const ProgressRing = ({
  progress,
  size = 180,
  strokeWidth = 14,
  children,
}: ProgressRingProps) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className={styles.track}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn(styles.indicator, progress > 1 && styles.over)}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className={styles.content}>{children}</div>
    </div>
  );
};
