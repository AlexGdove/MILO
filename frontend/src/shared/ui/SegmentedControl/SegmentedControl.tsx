import { useId } from 'react';

import { cn } from '@/shared/lib';

import styles from './SegmentedControl.module.css';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** null — ничего не выбрано (например, пол в анкете) */
  value: T | null;
  onChange: (value: T) => void;
}

/** Выбор одного варианта из нескольких (радиогруппа в виде «чипсов»). */
export const SegmentedControl = <T extends string>({
  legend,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(styles.chip, value === option.value && styles.chipActive)}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
};
