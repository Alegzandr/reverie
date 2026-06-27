import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Accessible name; the trigger and listbox both reference it. */
  'aria-label': string;
  className?: string;
}

/**
 * Select-only combobox (WAI-ARIA "select-only" pattern). DOM focus stays on the
 * trigger; the active option is tracked with `aria-activedescendant`, so the
 * whole control is one tab stop with full keyboard support (arrows, Home/End,
 * type-ahead, Enter/Esc).
 *
 * It lives inside the settings Dialog, so the popup is a plain absolutely-
 * positioned panel (no portal): a body portal would read as "outside" to the
 * Dialog and dismiss it on click. The panel is an opaque HUD surface, never a
 * nested `.glass` — DESIGN.md forbids glass-in-glass. Escape and Enter stop
 * propagating while open so they close the menu, not the Dialog.
 */
export function Select({ value, onValueChange, options, 'aria-label': ariaLabel, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [activeIndex, setActiveIndex] = React.useState(selectedIndex);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const typeahead = React.useRef<{ buffer: string; at: number }>({ buffer: '', at: 0 });

  const baseId = React.useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selected = options[selectedIndex];

  const openMenu = React.useCallback((index: number) => {
    setActiveIndex(index);
    setOpen(true);
  }, []);

  const closeMenu = React.useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const commit = React.useCallback(
    (index: number) => {
      const opt = options[index];
      if (opt) onValueChange(opt.value);
      closeMenu();
    },
    [options, onValueChange, closeMenu],
  );

  // Keep the highlighted option in view as the user arrows or types through.
  React.useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  // Dismiss on an outside pointer press (stays scoped to this control, so it
  // never reaches the Dialog's own outside-press dismissal).
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const moveTo = (index: number) => setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));

  const runTypeahead = (key: string) => {
    const now = Date.now();
    const buffer = now - typeahead.current.at < 600 ? typeahead.current.buffer + key : key;
    typeahead.current = { buffer, at: now };
    const lower = buffer.toLowerCase();
    // Prefer a match after the current item so repeated keys cycle.
    const order = [
      ...options.slice(activeIndex + 1),
      ...options.slice(0, activeIndex + 1),
    ];
    const hit = order.find((o) => o.label.toLowerCase().startsWith(lower));
    if (hit) moveTo(options.indexOf(hit));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        openMenu(e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : selectedIndex);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveTo(activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveTo(0);
        break;
      case 'End':
        e.preventDefault();
        moveTo(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        commit(activeIndex);
        break;
      case 'Escape':
        // Close the menu only; don't let the Dialog catch this and close too.
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          runTypeahead(e.key);
        }
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? closeMenu() : openMenu(selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          'group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left',
          'border bg-[rgba(var(--color-surface),0.85)] text-sm font-semibold text-[rgb(var(--color-text))]',
          'outline-none transition-colors duration-200',
          'focus-visible:ring-2 focus-visible:ring-ring',
          open
            ? 'border-[rgba(var(--color-accent),0.65)]'
            : 'border-[rgba(var(--hud-line,var(--color-border)),0.6)] hover:border-[rgba(var(--color-accent),0.45)]',
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[rgb(var(--color-text-secondary))] transition-transform duration-200',
            open && 'rotate-180 text-[rgb(var(--color-accent-text))]',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        // Wrapper owns the rounded clip + border/shadow so the inner scrollbar
        // is masked by the radius instead of spilling past the corner.
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden',
            'rounded-xl border border-[rgba(var(--hud-line,var(--color-border)),0.7)]',
            'bg-[rgb(var(--color-surface))] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65),0_0_0_1px_rgba(var(--hud-line,var(--color-border)),0.25),0_0_24px_-6px_rgba(var(--color-accent),0.35)]',
            'animate-in fade-in-0 slide-in-from-top-1 duration-150 motion-reduce:animate-none',
          )}
        >
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          tabIndex={-1}
          className="max-h-60 overflow-y-auto py-1.5"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={opt.value}
                id={optionId(i)}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(i)}
                onPointerMove={() => setActiveIndex(i)}
                className={cn(
                  'mx-1.5 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm',
                  'transition-colors duration-100',
                  isSelected
                    ? 'font-semibold text-[rgb(var(--color-accent-text))]'
                    : 'font-medium text-[rgb(var(--color-text))]',
                  isActive
                    ? 'bg-[rgba(var(--color-accent),0.16)]'
                    : isSelected
                      ? 'bg-[rgba(var(--color-accent),0.08)]'
                      : 'bg-transparent',
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
        </div>
      )}
    </div>
  );
}
