import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EffectMode } from "./EffectControls";

interface EffectRowProps {
    icon: LucideIcon;
    label: string;
    mode: EffectMode;
    active: boolean;
    disabled?: boolean;
    onSelect: (mode: EffectMode) => void;
    statusLabel: string;
}

/**
 * One effect as a list row (icon + name + live status + power lamp). The effects
 * are exclusive modes, so selecting a row makes it the Active one and the rest
 * read Inactive — state is never carried by colour alone (a Power lamp + a text
 * status back it up). The whole row is the hit target.
 *
 * Memoised so adjusting a slider (which re-renders the parent on every tick) never
 * re-renders the rows whose active state is unchanged.
 */
export const EffectRow = memo(function EffectRow({
    icon: Icon,
    label,
    mode,
    active,
    disabled,
    onSelect,
    statusLabel,
}: EffectRowProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(mode)}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                "ios-button group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))] disabled:opacity-50",
                active
                    ? "border-[rgba(var(--color-accent),0.55)] bg-[rgba(var(--color-accent),0.12)] shadow-[0_10px_30px_-22px_rgba(var(--color-accent),0.9)]"
                    : "border-[rgba(var(--color-border),0.55)] hover:border-[rgba(var(--color-accent),0.4)] hover:bg-[rgba(var(--color-surface),0.5)]"
            )}
        >
            <span
                className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
                    active
                        ? "bg-[rgba(var(--color-accent),0.18)] text-[rgb(var(--color-accent-text))]"
                        : "bg-[rgba(var(--color-border),0.35)] text-[rgb(var(--color-text-secondary))]"
                )}
            >
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[rgb(var(--color-text))]">
                    {label}
                </span>
                <span
                    className={cn(
                        "block truncate text-xs",
                        active ? "text-[rgb(var(--color-accent-text))]" : "text-[rgb(var(--color-text-secondary))]"
                    )}
                >
                    {statusLabel}
                </span>
            </span>
            <Power
                className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-[rgb(var(--color-accent-text))]" : "text-[rgb(var(--color-text-secondary))] opacity-50"
                )}
                aria-hidden="true"
            />
        </button>
    );
});
