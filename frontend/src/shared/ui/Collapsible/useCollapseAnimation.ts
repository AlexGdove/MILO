import { useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';

const DURATION_MS = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Плавное раскрытие <details>: высота и прозрачность через Web Animations API;
 * при «уменьшить движение» или без поддержки — мгновенно.
 */
export const useCollapseAnimation = (defaultOpen: boolean) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  /** Целевое состояние для интерфейса (стрелка, aria): меняется сразу при нажатии */
  const [expanded, setExpanded] = useState(defaultOpen);
  const animationRef = useRef<Animation | null>(null);
  // Куда движемся: при нажатии во время анимации решает цель, а не ещё не обновлённое состояние
  const targetOpenRef = useRef(defaultOpen);

  const onSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const details = detailsRef.current;
    const body = bodyRef.current;
    if (!details || !body) return;

    const opening = !targetOpenRef.current;
    targetOpenRef.current = opening;
    setExpanded(opening);

    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }

    if (prefersReducedMotion() || typeof body.animate !== 'function') {
      body.style.overflow = '';
      setOpen(opening);
      return;
    }

    // Анимируем от текущей видимой высоты: если прервали — продолжаем с того же места
    const from = details.open ? body.offsetHeight : 0;
    body.style.overflow = 'hidden';

    if (opening) {
      setOpen(true);
      details.open = true;
      const to = body.scrollHeight;
      const animation = body.animate(
        [
          { height: `${from}px`, opacity: from === 0 ? 0 : 1 },
          { height: `${to}px`, opacity: 1 },
        ],
        { duration: DURATION_MS, easing: EASING },
      );
      animationRef.current = animation;
      animation.onfinish = () => {
        body.style.overflow = '';
        animationRef.current = null;
      };
    } else {
      const animation = body.animate(
        [
          { height: `${from}px`, opacity: 1 },
          { height: '0px', opacity: 0 },
        ],
        { duration: DURATION_MS, easing: EASING, fill: 'forwards' },
      );
      animationRef.current = animation;
      animation.onfinish = () => {
        // Закрываем сразу, иначе на один кадр видна полная высота (рывок)
        details.open = false;
        animation.cancel();
        body.style.overflow = '';
        animationRef.current = null;
        setOpen(false);
      };
    }
  };

  /** Синхронизация, если браузер раскрыл блок сам (например, поиск по странице). */
  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (animationRef.current === null) {
      targetOpenRef.current = event.currentTarget.open;
      setExpanded(event.currentTarget.open);
      setOpen(event.currentTarget.open);
    }
  };

  return { open, expanded, detailsRef, bodyRef, onSummaryClick, onToggle };
};
