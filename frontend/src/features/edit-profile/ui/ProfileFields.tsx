import { ACTIVITY_LEVELS, SEXES, WEIGHT_GOALS } from '@/entities/user-profile';
import { cn } from '@/shared/lib';
import { Input, SegmentedControl } from '@/shared/ui';

import styles from './ProfileForm.module.css';
import type { ProfileErrors, ProfileFormValues } from '../model/profileForm';

export type ProfileSection = 'body' | 'activity' | 'goal';

interface ProfileFieldsProps {
  values: ProfileFormValues;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  /** Какие блоки показывать (в пошаговой анкете — по одному) */
  sections?: readonly ProfileSection[];
}

/** Поля анкеты: пол, возраст, рост, вес; активность; цель. */
export const ProfileFields = ({
  values,
  errors,
  onChange,
  sections = ['body', 'activity', 'goal'],
}: ProfileFieldsProps) => (
  <>
    {sections.includes('body') && (
      <>
        <div className={styles.sex}>
          {/* Пол без значения по умолчанию: выбор пользователя влияет на формулу */}
          <SegmentedControl
            legend="Пол"
            options={SEXES}
            value={values.sex}
            onChange={(sex) => onChange({ sex })}
          />
          {errors.sex && <span className={styles.error}>{errors.sex}</span>}
        </div>
        <div className={styles.grid}>
          <Input
            label="Возраст, лет"
            inputMode="numeric"
            value={values.age}
            onChange={(event) => onChange({ age: event.target.value })}
            error={errors.age}
          />
          <Input
            label="Рост, см"
            inputMode="numeric"
            value={values.heightCm}
            onChange={(event) => onChange({ heightCm: event.target.value })}
            error={errors.heightCm}
          />
          <Input
            label="Вес, кг"
            inputMode="decimal"
            value={values.weightKg}
            onChange={(event) => onChange({ weightKg: event.target.value })}
            error={errors.weightKg}
          />
        </div>
      </>
    )}

    {sections.includes('activity') && (
      <fieldset className={styles.choices}>
        <legend className={styles.legend}>Активность в течение дня</legend>
        {ACTIVITY_LEVELS.map((level) => (
          <label
            key={level.value}
            className={cn(styles.choice, values.activity === level.value && styles.choiceActive)}
          >
            <input
              type="radio"
              name="activity"
              value={level.value}
              checked={values.activity === level.value}
              onChange={() => onChange({ activity: level.value })}
            />
            <span className={styles.choiceLabel}>{level.label}</span>
            <span className={styles.choiceText}>{level.description}</span>
          </label>
        ))}
      </fieldset>
    )}

    {sections.includes('goal') && (
      <SegmentedControl
        legend="Цель"
        options={WEIGHT_GOALS}
        value={values.goal}
        onChange={(goal) => onChange({ goal })}
      />
    )}
  </>
);
