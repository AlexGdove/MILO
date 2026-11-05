import { cn } from '@/shared/lib';

import styles from './Logo.module.css';

interface MiloMarkProps {
  /** Размер стороны знака в px */
  size?: number;
  /** Подпись для скринридеров; без неё знак декоративный */
  title?: string;
  className?: string;
}

/** Строчная «м» из двух арок (обводка 4.6, скруглённые концы) в сетке 48×48. */
const MARK_LETTER_PATH = 'M13 34V24.5a5.5 5.5 0 0 1 11 0V34M24 24.5a5.5 5.5 0 0 1 11 0V34';

/**
 * Знак MILO: скруглённый квадрат (rx 25%), строчная «м» из двух арок и мятная точка — «искра».
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
    <path className={styles.markLetter} d={MARK_LETTER_PATH} />
    <circle className={styles.markAccent} cx="36.5" cy="13.5" r="3.3" />
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
