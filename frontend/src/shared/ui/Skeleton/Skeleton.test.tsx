import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('скрыт от скринридеров и имеет размеры по умолчанию', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement | null;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    // jsdom пересчитывает em в px в computed style, поэтому проверяем заданное значение инлайн-стиля
    expect(el?.style.width).toBe('100%');
    expect(el?.style.height).toBe('1em');
  });

  it('принимает размеры', () => {
    const { container } = render(<Skeleton width="120px" height="16px" />);
    const el = container.firstElementChild;
    expect(el).toHaveStyle({ width: '120px', height: '16px' });
  });

  it('добавляет пользовательский класс', () => {
    const { container } = render(<Skeleton className="extra" />);
    const el = container.firstElementChild;
    expect(el).toHaveClass('extra');
  });
});
