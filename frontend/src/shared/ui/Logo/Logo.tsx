import { cn } from '@/shared/lib';

import styles from './Logo.module.css';

interface MiloMarkProps {
  /** Размер стороны знака в px */
  size?: number;
  /** Подпись для скринридеров; без неё знак декоративный */
  title?: string;
  className?: string;
}

/**
 * Знак MILO: скруглённый квадрат (rx 25%) и три столбика БЖУ — крайние равные, средний ниже.
 * Цвета берутся из токенов, поэтому знак сам переключается между светлой и тёмной версией.
 */
export const MiloMark = ({ size = 32, title, className }: MiloMarkProps) => (
  <svg
    className={cn(styles.mark, className)}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
  >
    <rect className={styles.markBg} width="48" height="48" rx="12" />
    <rect className={styles.markBar} x="9" y="12" width="8" height="24" rx="4" />
    <rect className={styles.markAccent} x="20" y="21" width="8" height="15" rx="4" />
    <rect className={styles.markBar} x="31" y="12" width="8" height="24" rx="4" />
  </svg>
);

interface MiloLogoProps {
  size?: 'sm' | 'md';
  className?: string;
}

const MARK_SIZE = { sm: 24, md: 32 } as const;

/** Основной логотип: знак + слово «MILO». */
export const MiloLogo = ({ size = 'md', className }: MiloLogoProps) => (
  <span className={cn(styles.logo, styles[size], className)} role="img" aria-label="MILO">
    <MiloMark size={MARK_SIZE[size]} />
    <span className={styles.wordmark} aria-hidden="true">
      MILO
    </span>
  </span>
);
