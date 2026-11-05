import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  // Регрессия (2026-11-05): кольцо с фиксированными 180 px вылезало из карточки сводки при 360 px
  it('size — наибольший размер, SVG масштабируется по viewBox без фиксированных пикселей', () => {
    const { container } = render(<ProgressRing progress={0.5} size={180} />);
    const wrapper = container.firstElementChild as HTMLElement;
    const svg = container.querySelector('svg');

    expect(wrapper.style.width).toBe('180px');
    expect(wrapper.style.height).toBe('');
    expect(svg).toHaveAttribute('viewBox', '0 0 180 180');
    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
  });

  it('заполненность соответствует доле, превышение — отдельный стиль', () => {
    const { container, rerender } = render(
      <ProgressRing progress={0.25} size={100} strokeWidth={10} />,
    );
    const indicator = () => container.querySelectorAll('circle')[1];
    const circumference = 2 * Math.PI * 45;
    expect(Number(indicator()?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      circumference * 0.75,
    );

    rerender(<ProgressRing progress={1.4} size={100} strokeWidth={10} />);
    expect(Number(indicator()?.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
    expect(indicator()?.getAttribute('class')).toMatch(/over/);
  });
});
