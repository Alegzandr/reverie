import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { SettingsMenu } from './SettingsMenu';
import { TooltipProvider } from './ui/tooltip';

const mockChangeLanguage = vi.fn();
const mockI18n = { language: 'en', changeLanguage: mockChangeLanguage };
const mockSetMood = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }),
}));

vi.mock('../contexts/MoodContext', () => ({
  useMood: () => ({ mood: 'light', def: { kind: 'workspace' }, setMood: mockSetMood }),
}));

const renderMenu = () =>
  render(
    <TooltipProvider>
      <SettingsMenu />
    </TooltipProvider>
  );

describe('SettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'en';
  });

  it('opens the menu and switches language', async () => {
    renderMenu();

    await userEvent.click(screen.getByLabelText('settings.open'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Español/ }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });

  it('selects a mood from the gallery', async () => {
    renderMenu();

    await userEvent.click(screen.getByLabelText('settings.open'));
    await userEvent.click(screen.getByLabelText('settings.mood.dark'));
    expect(mockSetMood).toHaveBeenCalledWith('dark');

    await userEvent.click(screen.getByLabelText('settings.mood.tidal'));
    expect(mockSetMood).toHaveBeenCalledWith('tidal');
  });
});
