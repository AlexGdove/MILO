import { useCookedDishStore, type CookedDish } from '@/entities/cooked-dish';
import { formatPortions } from '@/shared/lib';
import { Button } from '@/shared/ui';

interface DiscardDishButtonProps {
  dish: CookedDish;
}

/** Остаток выброшен или отдан: порции обнуляются, блюдо остаётся в истории. */
export const DiscardDishButton = ({ dish }: DiscardDishButtonProps) => {
  const discardRest = useCookedDishStore((state) => state.discardRest);

  return (
    <Button
      variant="ghost"
      size="small"
      onClick={() => {
        if (
          window.confirm(
            `Убрать остаток «${dish.name}» (${formatPortions(dish.servingsLeft)} порц.)?`,
          )
        ) {
          discardRest(dish.id);
        }
      }}
    >
      Убрать остаток
    </Button>
  );
};
