import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Grid2x2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, RAIL_THEME_ORDER } from '../contexts/themes';
import type { ThemeId } from '../contexts/themes';
import { SettingsMenu } from './SettingsMenu';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

/**
 * The workspace mood rail — an inline theme picker beside the waveform. Each theme
 * is a palette + an animated background over the same HUD, so switching it is the
 * fastest way to re-skin the whole atmosphere mid-listen. The featured mood reads
 * out at the top (a Mood chip that opens the full gallery), the five vibey
 * ambiances sit one tap away below, and the calm faces + language live behind
 * "More themes" (the settings dialog). This lifts theming out of a buried menu and
 * makes it a first-class, always-visible control.
 */

/** A small live swatch painted with the theme's own scene gradient. */
function Swatch({ id, className }: { id: ThemeId; className?: string }) {
  return (
    <span
      className={cn('block rounded-lg ring-1 ring-inset ring-[rgba(var(--hud-line),0.3)]', className)}
      style={{ background: THEMES[id].preview }}
      aria-hidden="true"
    />
  );
}

export function ThemeRail() {
  const { t } = useTranslation();
  const { theme, def, setTheme } = useTheme();
  const activeName = t(`settings.theme.${def.labelKey}`);

  return (
    <Card asChild className="hud-frame p-4 sm:p-5 audio-drift-b">
      <aside className="flex flex-col gap-5" aria-label={t('studio.themes')}>
        {/* Mood — the featured, currently-playing atmosphere. The chip opens the
            full gallery (calm faces + every mood + language). */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 min-h-7">
            <span className="hud-readout truncate">{t('studio.mood')}</span>
            <span className="hud-readout shrink-0">FX</span>
          </div>
          <SettingsMenu
            trigger={
              <button
                type="button"
                className="ios-button group flex w-full items-center gap-3 rounded-2xl border border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-surface),0.45)] px-3 py-2.5 text-left outline-none hover:border-[rgba(var(--color-accent),0.55)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))]"
              >
                <Swatch id={theme} className="h-8 w-8 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[rgb(var(--color-text))]">
                    {activeName}
                  </span>
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))] transition-transform group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            }
          />
        </div>

        {/* Themes — quick one-tap picker for the five ambiances. */}
        <div className="space-y-2">
          <span className="hud-readout block">{t('studio.themes')}</span>
          <ul className="space-y-1.5">
            {RAIL_THEME_ORDER.map((id) => {
              const tdef = THEMES[id];
              const Icon = tdef.icon;
              const active = theme === id;
              const label = t(`settings.theme.${tdef.labelKey}`);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setTheme(id)}
                    aria-pressed={active}
                    className={cn(
                      'ios-button flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))]',
                      active
                        ? 'border-[rgba(var(--color-accent),0.55)] bg-[rgba(var(--color-accent),0.12)]'
                        : 'border-transparent hover:border-[rgba(var(--color-border),0.6)] hover:bg-[rgba(var(--color-surface),0.5)]'
                    )}
                  >
                    <Swatch id={id} className="h-7 w-7 shrink-0" />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm font-medium',
                        active ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text))]'
                      )}
                    >
                      {label}
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-[rgb(var(--color-accent))]" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))]" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* More themes — the calm light/dark faces + language, in the dialog. */}
        <SettingsMenu
          trigger={
            <button
              type="button"
              className="ios-button mt-auto flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-[rgb(var(--color-text-secondary))] outline-none hover:text-[rgb(var(--color-text))] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))]"
            >
              <Grid2x2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('studio.moreThemes')}
            </button>
          }
        />
      </aside>
    </Card>
  );
}
