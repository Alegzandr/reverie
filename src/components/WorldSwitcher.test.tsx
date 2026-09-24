import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { WorldSwitcher } from './WorldSwitcher';
import { TooltipProvider } from './ui/tooltip';
import { MOOD_ORDER } from '../contexts/moods';

const mockSetMood = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../contexts/MoodContext', () => ({
  useMood: () => ({ mood: 'aurora', setMood: mockSetMood }),
}));

describe('WorldSwitcher', () => {
  it('offers every world, names the active one, and switches on click', async () => {
    render(
      <TooltipProvider>
        <WorldSwitcher />
      </TooltipProvider>
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(MOOD_ORDER.length);
    expect(screen.getByRole('radio', { name: 'settings.mood.aurora' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'settings.mood.tidal' }));
    expect(mockSetMood).toHaveBeenCalledWith('tidal');
  });

  it('holds one tab stop and walks the worlds with the arrow keys', async () => {
    mockSetMood.mockClear();
    render(
      <TooltipProvider>
        <WorldSwitcher />
      </TooltipProvider>
    );
    const active = screen.getByRole('radio', { name: 'settings.mood.aurora' });
    expect(active).toHaveAttribute('tabindex', '0');
    screen.getAllByRole('radio').filter((r) => r !== active).forEach((r) => expect(r).toHaveAttribute('tabindex', '-1'));
    expect(screen.getByRole('radiogroup')).toHaveAttribute('data-own-arrows');

    active.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(mockSetMood).toHaveBeenLastCalledWith(MOOD_ORDER[1]);
    await userEvent.keyboard('{End}');
    expect(mockSetMood).toHaveBeenLastCalledWith(MOOD_ORDER[MOOD_ORDER.length - 1]);
  });
});
