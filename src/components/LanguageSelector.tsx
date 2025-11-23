import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, X } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('language.open')}
        className="w-10 h-10 glass rounded-full flex items-center justify-center ios-button cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Globe className="w-5 h-5 text-[rgb(var(--color-text))]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center p-6"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="relative glass rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[rgba(var(--color-border),0.7)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--color-text))]">
                  {t('language.title')}
                </p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                  {t('language.subtitle')}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('language.close')}
                onClick={() => setOpen(false)}
                className="p-2 rounded-full ios-button bg-[rgba(var(--color-surface),0.8)] text-[rgb(var(--color-text))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {languages.map((lang) => {
                const active = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`
                      w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
                      transition-all duration-150 ios-button border
                      ${
                        active
                          ? 'border-[rgba(var(--color-accent),0.5)] bg-[rgba(var(--color-accent),0.08)] text-[rgb(var(--color-accent))]'
                          : 'border-[rgba(var(--color-border),0.6)] hover:border-[rgba(var(--color-accent),0.3)] text-[rgb(var(--color-text))]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-sm font-semibold">{lang.name}</span>
                    </div>
                    {active && <Check className="w-4 h-4" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[rgb(var(--color-text-secondary))] leading-relaxed">
              {t('language.notice')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
