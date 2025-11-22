import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    document.documentElement.lang = langCode;
  };

  return (
    <div className="relative group">
      <button
        aria-label="Select language"
        className="w-10 h-10 glass rounded-full flex items-center justify-center ios-button cursor-pointer"
      >
        <Globe className="w-5 h-5 text-[rgb(var(--color-text))]" />
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 glass rounded-2xl p-2 min-w-[160px] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 shadow-lg">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              w-full px-4 py-2.5 rounded-xl text-left text-sm font-medium
              flex items-center gap-2 transition-colors duration-150
              ${
                i18n.language === lang.code
                  ? 'bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))]'
                  : 'text-[rgb(var(--color-text))] hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
