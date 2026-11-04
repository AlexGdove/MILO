import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MiloLogo, MiloMark } from './Logo';

describe('MiloMark', () => {
  it('без подписи декоративен и скрыт от скринридеров', () => {
    const { container } = render(<MiloMark />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('с подписью доступен как изображение', () => {
    render(<MiloMark title="MILO" />);
    expect(screen.getByRole('img', { name: 'MILO' })).toBeInTheDocument();
  });

  it('рисует фон и три столбика: крайние одной высоты, средний ниже', () => {
    const { container } = render(<MiloMark size={48} />);
    const [bg, left, middle, right] = Array.from(container.querySelectorAll('rect'));
    expect(bg).toHaveAttribute('rx', '12');
    expect(left?.getAttribute('height')).toBe(right?.getAttribute('height'));
    expect(Number(middle?.getAttribute('height'))).toBeLessThan(
      Number(left?.getAttribute('height')),
    );
    expect(container.querySelector('svg')).toHaveAttribute('width', '48');
  });
});

describe('MiloLogo', () => {
  it('читается скринридером одним словом MILO', () => {
    render(<MiloLogo />);
    expect(screen.getByRole('img', { name: 'MILO' })).toHaveTextContent('MILO');
  });
});
