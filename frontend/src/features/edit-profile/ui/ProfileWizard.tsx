import { useState } from 'react';

import { useUserProfileStore } from '@/entities/user-profile';
import { Button } from '@/shared/ui';

import { NormPreview } from './NormPreview';
import { ProfileFields, type ProfileSection } from './ProfileFields';
import styles from './ProfileForm.module.css';
import {
  EMPTY_PROFILE_VALUES,
  toProfile,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from '../model/profileForm';
import { useSaveProfile } from '../model/useSaveProfile';

const STEPS: ReadonlyArray<{
  title: string;
  section: ProfileSection | 'result';
  fields: readonly ProfileField[];
}> = [
  { title: 'О вас', section: 'body', fields: ['sex', 'age', 'heightCm', 'weightKg'] },
  { title: 'Активность', section: 'activity', fields: [] },
  { title: 'Цель', section: 'goal', fields: [] },
  { title: 'Ваша норма', section: 'result', fields: [] },
];

interface ProfileWizardProps {
  /** После «Начать» или «Позже» */
  onFinish: () => void;
}

/** Анкета при первом запуске (решение №30): по шагам, с «Позже». */
export const ProfileWizard = ({ onFinish }: ProfileWizardProps) => {
  const saveProfile = useSaveProfile();
  const setOnboarding = useUserProfileStore((state) => state.setOnboarding);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE_VALUES);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  if (!current) return null;

  const next = () => {
    const stepErrors = validateProfile(values, current.fields);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const profile = toProfile(values);
    if (profile) {
      saveProfile(profile);
      onFinish();
    }
  };

  const later = () => {
    setOnboarding('later');
    onFinish();
  };

  return (
    <div className={styles.wizard}>
      <p className={styles.stepCounter}>
        Шаг {step + 1} из {STEPS.length}
      </p>
      <h2 className={styles.stepTitle}>{current.title}</h2>

      <div className={styles.form}>
        {current.section === 'result' ? (
          <NormPreview profile={toProfile(values)} />
        ) : (
          <ProfileFields
            values={values}
            errors={errors}
            sections={[current.section]}
            onChange={(patch) => setValues((value) => ({ ...value, ...patch }))}
          />
        )}
      </div>

      <div className={styles.wizardActions}>
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Назад
          </Button>
        )}
        <Button onClick={next}>{isLast ? 'Начать' : 'Далее'}</Button>
      </div>
      <Button variant="ghost" fullWidth onClick={later}>
        Позже
      </Button>
    </div>
  );
};
