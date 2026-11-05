import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { ROUTES } from '@/shared/config';
import { cn } from '@/shared/lib';

import styles from './BottomNav.module.css';
import { PantryIcon, ProfileIcon, RecipesIcon, TodayIcon } from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Только точное совпадение адреса (для «/»); иначе вкладка активна и на вложенных страницах */
  end?: boolean;
}

/** Навигация по решению №28: «Покупки» — вкладка кладовой, в шапке страниц — переход к приложению. */
const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Сегодня', icon: <TodayIcon />, end: true },
  { to: ROUTES.recipes, label: 'Рецепты', icon: <RecipesIcon /> },
  { to: ROUTES.pantry, label: 'Кладовая', icon: <PantryIcon /> },
  { to: ROUTES.profile, label: 'Профиль', icon: <ProfileIcon /> },
];

export const BottomNav = () => (
  <nav className={styles.nav} aria-label="Основная навигация">
    {NAV_ITEMS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => cn(styles.link, isActive && styles.active)}
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);
