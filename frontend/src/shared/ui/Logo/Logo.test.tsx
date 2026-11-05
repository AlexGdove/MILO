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

  // Требование изменилось 2026-11-05 (решение №22): знак — «м» из двух арок и точка вместо трёх столбиков
  it('рисует скруглённый фон, «м» из двух арок и точку', () => {
    const { container } = render(<MiloMark size={48} />);
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(1);
    expect(rects[0]).toHaveAttribute('rx', '12');

    const letter = container.querySelector('path');
    // две арки: две дуги одинакового радиуса, стоящие рядом
    expect(letter?.getAttribute('d')?.match(/a5\.5 5\.5/g)).toHaveLength(2);
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelector('svg')).toHaveAttribute('width', '48');
  });
});

describe('MiloLogo', () => {
  it('читается скринридером одним словом MILO', () => {
    render(<MiloLogo />);
    expect(screen.getByRole('img', { name: 'MILO' })).toHaveTextContent('MILO');
  });
});
