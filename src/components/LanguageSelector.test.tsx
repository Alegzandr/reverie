import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

const changeLanguage = vi.fn();
const i18n = { language: 'en', changeLanguage };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n }),
}));

describe('LanguageSelector', () => {
  it('lists languages and switches document lang', async () => {
    render(<LanguageSelector />);

    const portuguese = await screen.findByText('Português');
    expect(portuguese).toBeInTheDocument();

    await userEvent.click(portuguese);

    expect(changeLanguage).toHaveBeenCalledWith('pt');
    expect(document.documentElement.lang).toBe('pt');
  });
});
