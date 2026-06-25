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

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
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
    expect(mockNavigate).toHaveBeenCalledWith('/es/', { replace: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
