import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
}

/**
 * Aurora range slider. Deliberately built on a native <input type="range"> rather
 * than a Radix thumb: it keeps the control measurement-free (works in jsdom/tests
 * and SSR), fully keyboard-accessible for free, and drives the gradient fill via
 * the `--range` custom property the `.slider` utility reads.
 */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min = 0, max = 100, step, onValueChange, style, ...props }, ref) => {
    const lo = Number(min);
    const hi = Number(max);
    const range = hi > lo ? ((Number(value) - lo) / (hi - lo)) * 100 : 0;

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className={cn('slider', className)}
        style={{ '--range': `${range}%`, ...style } as React.CSSProperties}
        {...props}
      />
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
