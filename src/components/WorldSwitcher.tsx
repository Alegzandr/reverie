import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useMood } from '../contexts/MoodContext';
import { MOODS, MOOD_ORDER, worldThumb } from '../contexts/moods';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useRadioGroupKeys } from '../hooks/useRadioGroupKeys';

/**
 * The mood switcher in the top bar: one round window onto each world, the
 * active one opened into a pill that names it. One click re-skins everything -
 * palette and living world - so it lives in plain sight, never in a menu.
 * One tab stop (the checked world); arrows walk the rest.
 */
export const WorldSwitcher = memo(function WorldSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { mood, setMood } = useMood();
  const onKeyDown = useRadioGroupKeys(MOOD_ORDER, setMood);

  return (
    <div
      role="radiogroup"
      aria-label={t('studio.moods')}
      data-own-arrows
      onKeyDown={onKeyDown}
      className={cn('world-switcher', className)}
    >
      {MOOD_ORDER.map((id) => {
        const def = MOODS[id];
        const label = t(`settings.mood.${def.labelKey}`);
        const active = id === mood;
        const button = (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={label}
            onClick={() => setMood(id)}
            className={cn('world-chip', active && 'is-active')}
          >
            <span className="world-chip-thumb" style={{ backgroundImage: `url(${worldThumb(def.world)})` }} aria-hidden="true" />
            {active && <span className="world-chip-label">{label}</span>}
          </button>
        );
        return active ? (
          button
        ) : (
          <Tooltip key={id}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});
