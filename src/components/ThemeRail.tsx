import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES, THEME_ORDER } from '../contexts/themes';
import type { ThemeId } from '../contexts/themes';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

/**
 * The workspace mood rail — an inline theme picker beside the waveform. Each theme
 * is a palette + an animated background over the same HUD, so switching it is the
 * fastest way to re-skin the whole atmosphere mid-listen. The featured mood reads
 * out at the top in a dropdown that opens the full mood gallery (every theme),
 * and the moods you've reached for recently sit one tap away below. This lifts
 * theming out of a buried menu and makes it a first-class, always-visible control.
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

/**
 * The Mood dropdown — its trigger reads out the active atmosphere; opening it
 * reveals the exhaustive theme gallery in a popover (not the settings dialog).
 */
function MoodGallery() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeName = t(`settings.theme.${THEMES[theme].labelKey}`);

  // Dismiss on outside click or Escape — the lightweight popover contract.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="ios-button group flex w-full items-center gap-3 rounded-2xl border border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-surface),0.45)] px-3 py-2.5 text-left outline-none hover:border-[rgba(var(--color-accent),0.55)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))]"
      >
        <Swatch id={theme} className="h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[rgb(var(--color-text))]">
            {activeName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))] transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('studio.allThemes')}
          className="glass absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[19rem] overflow-y-auto rounded-2xl border border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-surface),0.95)] p-1.5 backdrop-blur-xl"
        >
          <ul className="space-y-1">
            {THEME_ORDER.map((id) => {
              const tdef = THEMES[id];
              const Icon = tdef.icon;
              const active = theme === id;
              const label = t(`settings.theme.${tdef.labelKey}`);
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setTheme(id);
                      setOpen(false);
                    }}
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
                        active ? 'text-[rgb(var(--color-accent-text))]' : 'text-[rgb(var(--color-text))]'
                      )}
                    >
                      {label}
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))]" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ThemeRail() {
  const { t } = useTranslation();
  const { theme, setTheme, recentThemes } = useTheme();

  return (
    <Card asChild className="hud-frame p-4 sm:p-5 audio-drift-b">
      <aside className="flex flex-col gap-5" aria-label={t('studio.themes')}>
        {/* Mood — the featured, currently-playing atmosphere. The dropdown opens
            the full gallery of every theme. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 min-h-7">
            <span className="hud-readout truncate">{t('studio.mood')}</span>
            <span className="hud-readout shrink-0">FX</span>
          </div>
          <MoodGallery />
        </div>

        {/* Recently used — quick one-tap return to the moods you've been cycling. */}
        <div className="space-y-2">
          <span className="hud-readout block">{t('studio.recentThemes')}</span>
          <ul className="space-y-1.5">
            {recentThemes
              .map((id) => ({ id, label: t(`settings.theme.${THEMES[id].labelKey}`) }))
              // Stable alphabetical order so switching moods doesn't reshuffle the
              // rail under your finger — only membership changes, never position.
              .sort((a, b) => a.label.localeCompare(b.label))
              .map(({ id, label }) => {
              const tdef = THEMES[id];
              const Icon = tdef.icon;
              const active = theme === id;
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
                        active ? 'text-[rgb(var(--color-accent-text))]' : 'text-[rgb(var(--color-text))]'
                      )}
                    >
                      {label}
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))]" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </Card>
  );
}
