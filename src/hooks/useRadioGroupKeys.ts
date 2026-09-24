import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Arrow/Home/End keys for a radiogroup with a roving tab stop: focus moves to
 * the neighbouring radio and selects it, wrapping at the ends. Wire the handler
 * on the `role="radiogroup"` element and give only the checked radio (or the
 * first, when none is) `tabIndex={0}`. The group should also carry
 * `data-own-arrows` so the global transport keys leave it alone.
 */
export function useRadioGroupKeys<T>(values: readonly T[], onSelect: (value: T) => void) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'));
      if (!radios.length) return;
      const from = radios.indexOf(document.activeElement as HTMLElement);
      let to: number;
      if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = radios.length - 1;
      else if (e.key in STEP) to = ((from < 0 ? 0 : from) + STEP[e.key] + radios.length) % radios.length;
      else return;
      e.preventDefault();
      radios[to].focus();
      const value = values[to];
      if (value !== undefined) onSelect(value);
    },
    [values, onSelect],
  );
}
