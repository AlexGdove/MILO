import { useState } from 'react';

import { mealTypeLabel, type MealType } from '@/entities/meal-entry';
import type { IsoDate } from '@/shared/lib';
import { Button, Modal } from '@/shared/ui';

import { AddMealEntryForm } from './AddMealEntryForm';

interface AddMealEntryButtonProps {
  date: IsoDate;
  mealType: MealType;
  label?: string;
  fullWidth?: boolean;
}

export const AddMealEntryButton = ({
  date,
  mealType,
  label = '+ Добавить',
  fullWidth,
}: AddMealEntryButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={fullWidth ? 'primary' : 'ghost'}
        size={fullWidth ? 'medium' : 'small'}
        fullWidth={fullWidth}
        onClick={() => setOpen(true)}
        aria-label={fullWidth ? undefined : `Добавить в ${mealTypeLabel(mealType).toLowerCase()}`}
      >
        {label}
      </Button>
      <Modal open={open} title="Добавить приём пищи" onClose={() => setOpen(false)}>
        <AddMealEntryForm date={date} initialMealType={mealType} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
};
