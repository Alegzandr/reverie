import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Check } from 'lucide-react';
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
import { THEMES, THEME_ORDER } from '../contexts/themes';
import type { ThemeId } from '../contexts/themes';
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

interface SettingsMenuProps {
  /** Optional custom trigger; defaults to the gear icon button in the chrome.
   *  The theme rail passes its "More themes" row and Mood chip here so they open
   *  the same dialog without duplicating it. */
  trigger?: ReactNode;
}

export function SettingsMenu({ trigger }: SettingsMenuProps = {}) {
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const renderThemeCard = (id: ThemeId) => {
    const def = THEMES[id];
    const Icon = def.icon;
    const active = theme === id;
    const label = t(`settings.theme.${def.labelKey}`);
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTheme(id)}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          'group ios-button relative overflow-hidden rounded-2xl border text-left outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))]',
          active
            ? 'border-[rgba(var(--color-accent),0.7)] shadow-[0_12px_34px_-22px_rgba(var(--color-accent),0.95)]'
            : 'border-[rgba(var(--color-border),0.7)] hover:border-[rgba(var(--color-accent),0.5)]'
        )}
      >
        {/* Live preview swatch — the theme's own scene/backdrop colours */}
        <span
          className="block h-14 w-full"
          style={{ background: def.preview }}
          aria-hidden="true"
        />
        <span className="flex items-center justify-between gap-2 px-3 py-2 bg-[rgba(var(--color-surface),0.6)]">
          <span className="flex items-center gap-2 min-w-0">
            <Icon
              className={cn('w-4 h-4 shrink-0', active ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text-secondary))]')}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold truncate text-[rgb(var(--color-text))]">{label}</span>
          </span>
          {active && <Check className="w-4 h-4 shrink-0 text-[rgb(var(--color-accent))]" aria-hidden="true" />}
        </span>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
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
      )}

      <DialogContent closeLabel={t('settings.close')}>
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[64vh] overflow-y-auto pr-1 -mr-1">
          {/* Theme gallery — every theme is a palette + animated background over
              the same futuristic HUD. */}
          <section className="mb-5">
            <h3 className="text-[11px] uppercase tracking-wide text-[rgb(var(--color-text-secondary))] mb-2">
              {t('settings.themes')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">{THEME_ORDER.map(renderThemeCard)}</div>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wide text-[rgb(var(--color-text-secondary))] mb-2">
              {t('settings.language')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
