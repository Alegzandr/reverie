import type { LucideIcon } from "lucide-react";
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
 * Reusable button component for selecting audio effect modes
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
        <button
            onClick={onClick}
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={label}
            className={`
                glass rounded-[14px] px-4 py-4
                font-medium text-[14px]
                ios-button transition-all duration-200
                ${
                    isActive
                        ? "bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50"
                        : "border-2 border-transparent"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
        >
            <div className="flex flex-col items-center justify-center gap-1">
                <Icon
                    className={`w-5 h-5 ${
                        isActive
                            ? "text-[rgb(var(--color-accent))]"
                            : "text-[rgb(var(--color-text-secondary))]"
                    }`}
                    aria-hidden="true"
                />
                <span
                    className={
                        isActive
                            ? "text-[rgb(var(--color-accent))]"
                            : "text-[rgb(var(--color-text))]"
                    }
                >
                    {label}
                </span>
            </div>
        </button>
    );
}
