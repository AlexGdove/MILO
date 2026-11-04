import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { ROUTES, type AppRoute } from '@/shared/config';
import { cn } from '@/shared/lib';

import styles from './BottomNav.module.css';
import { DiaryIcon, HomeIcon, ProductsIcon, ProfileIcon } from './icons';

interface NavItem {
  to: AppRoute;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Сегодня', icon: <HomeIcon /> },
  { to: ROUTES.diary, label: 'Дневник', icon: <DiaryIcon /> },
  { to: ROUTES.pantry, label: 'Кладовая', icon: <ProductsIcon /> },
  { to: ROUTES.profile, label: 'Профиль', icon: <ProfileIcon /> },
];

export const BottomNav = () => (
  <nav className={styles.nav} aria-label="Основная навигация">
    {NAV_ITEMS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end
        className={({ isActive }) => cn(styles.link, isActive && styles.active)}
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);
