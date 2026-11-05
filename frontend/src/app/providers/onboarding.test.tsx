import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUserGoalStore } from '@/entities/user-goal';
import { useUserProfileStore } from '@/entities/user-profile';
import { DashboardPage } from '@/pages/dashboard';
import { ProfilePage } from '@/pages/profile';
import { WelcomePage } from '@/pages/welcome';
import { ROUTES } from '@/shared/config';

import { OnboardingGate } from './OnboardingGate';

const renderApp = (path = '/') => {
  const router = createMemoryRouter(
    [
      { path: ROUTES.welcome, element: <WelcomePage /> },
      {
        path: ROUTES.dashboard,
        element: (
          <OnboardingGate>
            <DashboardPage />
          </OnboardingGate>
        ),
      },
      {
        path: ROUTES.profile,
        element: (
          <OnboardingGate>
            <ProfilePage />
          </OnboardingGate>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
};

const profile = () => useUserProfileStore.getState().profile;
const goalState = () => useUserGoalStore.getState();

beforeEach(() => {
  localStorage.clear();
  useUserProfileStore.setState(useUserProfileStore.getInitialState(), true);
  useUserGoalStore.setState(useUserGoalStore.getInitialState(), true);
});

describe('первый запуск', () => {
  it('без пройденной анкеты открывается приветствие', () => {
    const { router } = renderApp('/');
    expect(router.state.location.pathname).toBe('/welcome');
    expect(screen.getByRole('heading', { name: 'Добро пожаловать в MILO' })).toBeInTheDocument();
  });

  it('анкета по шагам: проверка полей, расчёт нормы, переход на «Сегодня»', async () => {
    const { router, user } = renderApp('/');

    // Шаг 1 — без данных дальше не пускает
    await user.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByText('Выберите пол')).toBeInTheDocument();
    expect(screen.getByText(/Возраст: целое число от 14 до 100 лет/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Мужской' }));
    await user.type(screen.getByLabelText('Возраст, лет'), '30');
    await user.type(screen.getByLabelText('Рост, см'), '180');
    await user.type(screen.getByLabelText('Вес, кг'), '80');
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    // Шаг 2 — активность
    expect(screen.getByRole('heading', { name: 'Активность' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Средняя/ }));
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    // Шаг 3 — цель (по умолчанию «Удерживать»)
    expect(screen.getByRole('radio', { name: 'Удерживать' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    // Шаг 4 — норма: 1780 × 1,55 = 2759 ккал
    expect(screen.getByText('2759')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Начать' }));

    expect(profile()).toEqual({
      sex: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activity: 'moderate',
      goal: 'maintain',
    });
    expect(goalState()).toMatchObject({
      mode: 'auto',
      goal: { kcal: 2759, protein: 96, fat: 92, carbs: 387 },
    });
    expect(useUserProfileStore.getState().onboarding).toBe('done');
    expect(router.state.location.pathname).toBe('/');
  });

  it('«Позже» — на «Сегодня» напоминание заполнить профиль', async () => {
    const { router, user } = renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Позже' }));

    expect(useUserProfileStore.getState().onboarding).toBe('later');
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('Заполните профиль')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Заполнить →' })).toHaveAttribute('href', '/profile');
  });
});

describe('профиль', () => {
  const man = {
    sex: 'male' as const,
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'moderate' as const,
    goal: 'maintain' as const,
  };

  beforeEach(() => {
    useUserProfileStore.setState({ profile: man, onboarding: 'done' });
    useUserGoalStore.getState().setAutoGoal({ kcal: 2759, protein: 96, fat: 92, carbs: 387 });
  });

  it('правка данных пересчитывает норму по профилю', async () => {
    const { user } = renderApp('/profile');
    expect(screen.getByLabelText('Вес, кг')).toHaveValue('80');

    await user.click(screen.getByRole('radio', { name: 'Похудеть' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить профиль' }));

    expect(profile()?.goal).toBe('lose');
    expect(goalState().goal.kcal).toBe(2259);
    expect(screen.getByRole('button', { name: 'Сохранено ✓' })).toBeInTheDocument();
  });

  it('своя норма не перезаписывается профилем; «Считать по профилю» возвращает расчёт', async () => {
    const { user } = renderApp('/profile');

    await user.click(screen.getByRole('button', { name: 'Задать свою норму' }));
    const kcal = screen.getByLabelText('Калории, ккал');
    await user.clear(kcal);
    await user.type(kcal, '2000');
    await user.click(screen.getByRole('button', { name: 'Сохранить цель' }));
    expect(goalState()).toMatchObject({ mode: 'manual', goal: { kcal: 2000 } });

    await user.click(screen.getByRole('radio', { name: 'Набрать' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить профиль' }));
    expect(goalState().goal.kcal).toBe(2000);

    await user.click(screen.getByRole('button', { name: 'Считать по профилю' }));
    expect(goalState()).toMatchObject({ mode: 'auto', goal: { kcal: 3059 } });
  });
});
