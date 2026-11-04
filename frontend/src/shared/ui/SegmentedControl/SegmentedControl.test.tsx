import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'g', label: 'г' },
  { value: 'pcs', label: 'шт' },
] as const;

describe('SegmentedControl', () => {
  it('показывает группу с подписью и отмечает выбранный вариант', () => {
    const onChange = vi.fn();
    render(<SegmentedControl legend="Единица" options={OPTIONS} value="g" onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'Единица' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'г' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'шт' })).not.toBeChecked();
  });

  it('сообщает о выборе другого варианта', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl legend="Единица" options={OPTIONS} value="g" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'шт' }));
    expect(onChange).toHaveBeenCalledWith('pcs');
  });

  it('радиокнопки одной группы имеют общее имя', () => {
    render(<SegmentedControl legend="Единица" options={OPTIONS} value="g" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]?.getAttribute('name')).toBe(radios[1]?.getAttribute('name'));
    expect(radios[0]?.getAttribute('name')).toBeTruthy();
  });
});
