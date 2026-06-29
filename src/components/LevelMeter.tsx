import { memo } from 'react';
import { cn } from '@/lib/utils';

interface LevelMeterProps {
  /** 0..1 fill for the `reactive` variant - lights segments up to this level.
   *  Ignored by the `scroll` variant. */
  value?: number;
  /** `reactive` tracks a setting (the fill follows `value`); `scroll` is free
   *  ambient telemetry (a travelling wave, tied to nothing). */
  variant?: 'reactive' | 'scroll';
  segments?: number;
  className?: string;
}

/**
 * A compact segmented VU-meter - the HUD's hardware-module readout. Pure
 * CSS/markup (no canvas, no rAF): `reactive` fills to a value so it mirrors an
 * effect setting as you turn it; `scroll` runs a staggered travelling wave for
 * the always-alive instruments. Decorative, so it's hidden from assistive tech.
 * Both variants freeze flat under `prefers-reduced-motion` (handled in CSS).
 */
export const LevelMeter = memo(function LevelMeter({
  value = 0,
  variant = 'reactive',
  segments = 18,
  className,
}: LevelMeterProps) {
  const v = Math.min(1, Math.max(0, value));
  const lit = Math.round(v * segments);
  return (
    <div
      className={cn('level-meter', variant === 'scroll' && 'level-meter-scroll', className)}
      aria-hidden="true"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn('level-seg', variant === 'reactive' && i < lit && 'is-lit')}
          style={{ ['--i' as string]: i }}
        />
      ))}
    </div>
  );
});
