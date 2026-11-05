import { useState, type FormEvent } from 'react';

import { useUserProfileStore } from '@/entities/user-profile';
import { Button } from '@/shared/ui';

import { NormPreview } from './NormPreview';
import { ProfileFields } from './ProfileFields';
import styles from './ProfileForm.module.css';
import {
  toFormValues,
  toProfile,
  validateProfile,
  type ProfileErrors,
  type ProfileFormValues,
} from '../model/profileForm';
import { useSaveProfile } from '../model/useSaveProfile';

/** Данные профиля в «Профиле»: все поля сразу, сохранение пересчитывает норму (если она по профилю). */
export const ProfileForm = () => {
  const profile = useUserProfileStore((state) => state.profile);
  const saveProfile = useSaveProfile();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(profile));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    const next = toProfile(values);
    if (next) {
      saveProfile(next);
      setSaved(true);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <ProfileFields
        values={values}
        errors={errors}
        onChange={(patch) => {
          setSaved(false);
          setValues((current) => ({ ...current, ...patch }));
        }}
      />
      <NormPreview profile={toProfile(values)} />
      <Button type="submit" fullWidth>
        {saved ? 'Сохранено ✓' : 'Сохранить профиль'}
      </Button>
    </form>
  );
};
