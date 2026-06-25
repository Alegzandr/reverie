import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Sun, Moon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export function SettingsMenu() {
  const { i18n, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const selectTheme = (next: 'light' | 'dark') => {
    if (theme !== next) toggleTheme();
  };

  const themeOptions: { value: 'light' | 'dark'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label={t('settings.open')} className="glass">
              <Settings className="w-5 h-5 text-[rgb(var(--color-text))]" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('settings.open')}</TooltipContent>
      </Tooltip>

      <DialogContent closeLabel={t('settings.close')}>
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.subtitle')}</DialogDescription>
        </DialogHeader>

        {/* Appearance */}
        <section className="mb-5">
          <h3 className="text-[11px] uppercase tracking-wide text-[rgb(var(--color-text-secondary))] mb-2">
            {t('settings.appearance')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <Button
                  key={value}
                  type="button"
                  variant={active ? 'accent' : 'outline'}
                  onClick={() => selectTheme(value)}
                  aria-pressed={active}
                  aria-label={label}
                  className={cn('justify-center gap-2', !active && 'text-[rgb(var(--color-text))]')}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Language */}
        <section>
          <h3 className="text-[11px] uppercase tracking-wide text-[rgb(var(--color-text-secondary))] mb-2">
            {t('settings.language')}
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-[42vh] overflow-y-auto pr-1 -mr-1">
            {languages.map((lang) => {
              const active = i18n.language === lang.code;
              return (
                <Button
                  key={lang.code}
                  type="button"
                  variant={active ? 'accent' : 'outline'}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn(
                    'h-auto justify-between gap-2 px-3 py-2.5 rounded-2xl',
                    !active && 'text-[rgb(var(--color-text))]'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{lang.flag}</span>
                    <span className="text-sm font-semibold truncate">{lang.name}</span>
                  </span>
                  {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                </Button>
              );
            })}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
