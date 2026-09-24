import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EffectMode } from "./EffectControls";

interface EffectRowProps {
    icon: LucideIcon;
    label: string;
    mode: EffectMode;
    active: boolean;
    /** Holds the group's single tab stop (the checked row, or the first when none is). */
    focusable: boolean;
    disabled?: boolean;
    onSelect: (mode: EffectMode) => void;
}

/**
 * One effect as a radio row (icon + name + selection mark). The effects are
 * exclusive, so the group reads as a radiogroup; the filled mark (a shape, not
 * just a hue) carries the choice. Pressing the checked row again lets the
 * original track through - the one liberty taken with plain radio behaviour.
 *
 * Memoised so adjusting a slider (which re-renders the parent on every tick) never
 * re-renders the rows whose active state is unchanged.
 */
export const EffectRow = memo(function EffectRow({
    icon: Icon,
    label,
    mode,
    active,
    focusable,
    disabled,
    onSelect,
}: EffectRowProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={focusable ? 0 : -1}
            onClick={() => onSelect(mode)}
            disabled={disabled}
            className={cn(
                "ios-button group flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))] disabled:opacity-50",
                active
                    ? "border-[rgba(var(--color-accent),0.55)] bg-[rgba(var(--color-accent),0.12)] shadow-[0_10px_30px_-22px_rgba(var(--color-accent),0.9)]"
                    : "border-[rgba(var(--color-border),0.55)] hover:border-[rgba(var(--color-accent),0.4)] hover:bg-[rgba(var(--color-surface),0.5)]"
            )}
        >
            <span
                className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors",
                    active
                        ? "bg-[rgba(var(--color-accent),0.18)] text-[rgb(var(--color-accent-text))]"
                        : "bg-[rgba(var(--color-border),0.35)] text-[rgb(var(--color-text-secondary))]"
                )}
            >
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-[rgb(var(--color-text))] [overflow-wrap:anywhere]">
                {label}
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
                    active
                        ? "border-[rgb(var(--color-accent-text))]"
                        : "border-[rgba(var(--color-text-secondary),0.6)]"
                )}
            >
                {active && <span className="h-2 w-2 rounded-full bg-[rgb(var(--color-accent-text))]" />}
            </span>
        </button>
    );
});
