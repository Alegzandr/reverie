import { memo } from 'react';
import { cn } from '@/lib/utils';

interface HudDialProps {
  /** Spin the rings (e.g. while a track plays). Silenced under reduced-motion. */
  spinning?: boolean;
  /** Number of graduation ticks around the rim. */
  ticks?: number;
  className?: string;
}

/**
 * A holographic instrument dial — concentric rings, a graduated tick rim, and a
 * short accent arc — borrowed from the Iron Man / S.H.I.E.L.D. HUD language.
 * Pure decoration (aria-hidden), coloured by the active theme's --hud-line /
 * --color-accent. Memoised: the transport re-renders every frame, but the dial
 * only depends on `spinning`, so it never redraws its ticks mid-playback.
 */
function HudDialBase({ spinning = false, ticks = 44, className }: HudDialProps) {
  const marks = Array.from({ length: ticks }, (_, i) => {
    const angle = (i / ticks) * Math.PI * 2;
    const long = i % 4 === 0;
    const r1 = long ? 43 : 45.5;
    const r2 = 49;
    return {
      x1: 50 + Math.cos(angle) * r1,
      y1: 50 + Math.sin(angle) * r1,
      x2: 50 + Math.cos(angle) * r2,
      y2: 50 + Math.sin(angle) * r2,
      long,
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('hud-dial', spinning && 'is-spinning', className)}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48.5" stroke="rgb(var(--hud-line))" strokeOpacity="0.3" strokeWidth="0.5" />
      <g className="hud-spin">
        {marks.map((m, i) => (
          <line
            key={i}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            stroke="rgb(var(--hud-line))"
            strokeOpacity={m.long ? 0.6 : 0.3}
            strokeWidth={m.long ? 0.8 : 0.5}
          />
        ))}
      </g>
      <g className="hud-spin-rev">
        <circle
          cx="50"
          cy="50"
          r="39"
          stroke="rgb(var(--color-accent))"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeDasharray="34 211"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="rgb(var(--hud-line))"
          strokeOpacity="0.22"
          strokeWidth="0.6"
          strokeDasharray="1.5 6"
        />
      </g>
    </svg>
  );
}

export const HudDial = memo(HudDialBase);
