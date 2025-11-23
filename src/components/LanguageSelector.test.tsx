import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

const mockChangeLanguage = vi.fn();
const mockI18n = { language: 'en', changeLanguage: mockChangeLanguage };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: mockI18n,
  }),
}));

describe('LanguageSelector modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'en';
    document.documentElement.lang = 'en';
  });

  it('opens a modal and switches languages', async () => {
    render(<LanguageSelector />);

    await userEvent.click(screen.getByRole('button', { name: 'language.open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Español/ }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
