import styles from './Stepper.module.css';
import { Button } from '../Button/Button';

interface StepperProps {
  /** Подпись слева и доступное имя значения */
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/** Целое число с кнопками − / + (порции и т. п.). */
export const Stepper = ({ label, value, min = 1, max = Infinity, onChange }: StepperProps) => (
  <div className={styles.stepper}>
    <span className={styles.label}>{label}</span>
    <Button
      variant="secondary"
      size="small"
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      aria-label={`${label}: меньше`}
    >
      −
    </Button>
    <output className={styles.value} aria-label={label}>
      {value}
    </output>
    <Button
      variant="secondary"
      size="small"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      aria-label={`${label}: больше`}
    >
      +
    </Button>
  </div>
);
