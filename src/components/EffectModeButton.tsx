import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EffectMode } from "./EffectControls";

interface EffectModeButtonProps {
    mode: EffectMode;
    currentMode: EffectMode;
    icon: LucideIcon;
    label: string;
    disabled?: boolean;
    onClick: () => void;
}

/**
 * Segmented selector for an audio effect mode, built on the shadcn Button.
 * Selected state pairs the Aurora accent with an icon + label, never colour alone.
 * Not a glass surface: it lives inside the glass control panel and glass never nests.
 */
export function EffectModeButton({
    mode,
    currentMode,
    icon: Icon,
    label,
    disabled,
    onClick,
}: EffectModeButtonProps) {
    const isActive = mode === currentMode;

    return (
        <Button
            type="button"
            variant={isActive ? "accent" : "secondary"}
            onClick={onClick}
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={label}
            className="group h-auto flex-col gap-2 rounded-[14px] px-3 py-4 text-center disabled:opacity-50"
        >
            <Icon
                className={cn(
                    "w-5 h-5 transition-colors",
                    isActive
                        ? "text-[rgb(var(--color-accent))]"
                        : "text-[rgb(var(--color-text-secondary))]"
                )}
                aria-hidden="true"
            />
            <span
                className={cn(
                    "text-[13px] font-medium leading-tight transition-colors",
                    isActive
                        ? "text-[rgb(var(--color-accent))]"
                        : "text-[rgb(var(--color-text))]"
                )}
            >
                {label}
            </span>
        </Button>
    );
}
