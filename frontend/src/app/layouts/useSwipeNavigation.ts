import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { MAIN_SECTIONS } from '@/shared/config';
import { adjacentSection, detectSwipe, type SwipeDirection } from '@/shared/lib';

/** Касание у самого края экрана — системный жест «назад» iOS / Android, его не перехватываем. */
const EDGE_GUARD_PX = 24;
/** Где свайп не переключает страницу: поля ввода и то, что помечено явно. */
const IGNORED = 'input, textarea, select, [contenteditable="true"], [data-no-swipe]';

/** Элемент (или предок) сам прокручивается по горизонтали — свайп принадлежит ему. */
function insideHorizontalScroll(target: Element | null): boolean {
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth) {
      const { overflowX } = getComputedStyle(el);
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
  }
  return false;
}

function canStartSwipe(target: EventTarget | null, x: number): boolean {
  if (x < EDGE_GUARD_PX || x > window.innerWidth - EDGE_GUARD_PX) return false;
  // Открытый диалог («Добавить еду», формы) — страницу под ним не листаем
  if (document.querySelector('dialog[open]')) return false;
  const element = target instanceof Element ? target : null;
  if (element?.closest(IGNORED)) return false;
  return !insideHorizontalScroll(element);
}

/** Направление последнего перехода свайпом — для анимации въезда страницы (`global.css`). */
export const SWIPE_ATTRIBUTE = 'data-swipe';

/**
 * Свайп влево-вправо по корневой странице раздела переключает разделы нижней навигации
 * (порядок — `MAIN_SECTIONS`). Только касание (мышь не листает), без зацикливания по краям.
 */
export function useSwipeNavigation(): void {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch && canStartSwipe(event.target, touch.clientX)
          ? { x: touch.clientX, y: touch.clientY, t: event.timeStamp }
          : null;
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const direction = detectSwipe({
        dx: touch.clientX - start.x,
        dy: touch.clientY - start.y,
        dt: event.timeStamp - start.t,
      });
      start = null;
      if (!direction) return;
      const target = adjacentSection(MAIN_SECTIONS, pathname, direction);
      if (!target) return;
      markDirection(direction);
      void navigate(target);
    };
    const onCancel = () => {
      start = null;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [pathname, navigate]);
}

/** Страница въезжает с той стороны, куда ушёл палец; атрибут снимается после анимации. */
function markDirection(direction: SwipeDirection): void {
  const root = document.documentElement;
  root.setAttribute(SWIPE_ATTRIBUTE, direction);
  window.setTimeout(() => root.removeAttribute(SWIPE_ATTRIBUTE), 400);
}
