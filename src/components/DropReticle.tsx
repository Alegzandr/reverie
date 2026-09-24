import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropReticleProps {
  /** Glyph centred in the lens (pass any sizing/hover classes on it). */
  icon: ReactNode;
  /** A file is hovering the dropzone: the reticle locks on. */
  active?: boolean;
  className?: string;
}

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const TICK_COUNT = 72;
/** Every Nth tick is a major graduation, like the helmet's horizon rulers. */
const MAJOR_TICK_EVERY = 6;
const TICK_OUTER_R = 49;
const TICK_MINOR_R = 46.5;
const TICK_MAJOR_R = 44;
const ARC_R = 39;
const LENS_R = 31;

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = (i / TICK_COUNT) * Math.PI * 2;
  const major = i % MAJOR_TICK_EVERY === 0;
  const inner = major ? TICK_MAJOR_R : TICK_MINOR_R;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    major,
    x1: CENTER + cos * inner,
    y1: CENTER + sin * inner,
    x2: CENTER + cos * TICK_OUTER_R,
    y2: CENTER + sin * TICK_OUTER_R,
  };
});

/** Four lit arcs, a quarter turn apart: the pane's corner brackets bent round. */
const ARC_SEGMENTS = 4;
const ARC_FILL = 0.42;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R;
const ARC_DASH = (ARC_CIRCUMFERENCE / ARC_SEGMENTS) * ARC_FILL;
const ARC_GAP = ARC_CIRCUMFERENCE / ARC_SEGMENTS - ARC_DASH;
/** SVG strokes start at 3 o'clock; shift so each arc centres on a diagonal. */
const ARC_OFFSET = -(ARC_CIRCUMFERENCE / (ARC_SEGMENTS * 2) - ARC_DASH / 2);

/**
 * The hero dropzone's mark: a visor reticle rather than a badge. A graduated
 * dial in the mood's hairline, four accent arcs (the pane's corner brackets
 * bent into a circle) slowly sweeping, and a glass lens holding the glyph.
 * Everything is tinted by the active mood, so it belongs to the HUD the way
 * the play orb does instead of wearing the fixed Aurora gradient.
 */
export function DropReticle({ icon, active, className }: DropReticleProps) {
  return (
    <div className={cn('drop-reticle', active && 'is-active', className)} aria-hidden="true">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="drop-reticle-dial">
        <g className="drop-reticle-ticks">
          {TICKS.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              className={tick.major ? 'is-major' : undefined}
            />
          ))}
        </g>
        <circle
          className="drop-reticle-arcs"
          cx={CENTER}
          cy={CENTER}
          r={ARC_R}
          strokeDasharray={`${ARC_DASH} ${ARC_GAP}`}
          strokeDashoffset={ARC_OFFSET}
        />
        <circle className="drop-reticle-lens" cx={CENTER} cy={CENTER} r={LENS_R} />
      </svg>
      <span className="drop-reticle-icon">{icon}</span>
    </div>
  );
}
