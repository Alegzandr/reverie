import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface MetaReadoutProps {
  label: string;
  value: string;
}

/**
 * One metadata readout (label above value) in the track-identity strip. Both
 * lines are clamped to their column with an ellipsis; the styled app tooltip
 * reveals the full text on hover, but only when something is actually clipped,
 * so readouts that already fit stay quiet (no redundant hover affordance).
 */
export const MetaReadout = memo(function MetaReadout({ label, value }: MetaReadoutProps) {
  const labelRef = useRef<HTMLElement>(null);
  const valueRef = useRef<HTMLElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const overflows = (el: HTMLElement | null) => !!el && el.scrollWidth > el.clientWidth + 1;
    const measure = () => setClipped(overflows(labelRef.current) || overflows(valueRef.current));
    measure();
    const ro = new ResizeObserver(measure);
    if (labelRef.current) ro.observe(labelRef.current);
    if (valueRef.current) ro.observe(valueRef.current);
    // The brand fonts load async; re-measure once they settle so the verdict
    // matches the final glyph widths, not the fallback metrics.
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => ro.disconnect();
  }, [label, value]);

  // Stable tree: the cell stays mounted under the same trigger whether or not it
  // is clipped, so the dt/dd nodes never remount and the ResizeObserver keeps
  // tracking the live ones. Only the content toggles, so widening back to a fit
  // removes the tooltip instead of stranding it on detached nodes.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-1 min-w-0">
          <dt ref={labelRef} className="hud-readout truncate">
            {label}
          </dt>
          <dd ref={valueRef} className="text-sm font-medium tabular-nums text-[rgb(var(--color-text))] truncate">
            {value}
          </dd>
        </div>
      </TooltipTrigger>
      {clipped && (
        <TooltipContent>
          {label}: {value}
        </TooltipContent>
      )}
    </Tooltip>
  );
});
