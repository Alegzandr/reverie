interface EffectSliderProps {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    disabled?: boolean;
    onChange: (value: number) => void;
    formatValue: (value: number) => string;
    showMarkers?: boolean;
    markers?: string[];
}

/**
 * Reusable slider component for audio effect controls
 */
export function EffectSlider({
    id,
    label,
    value,
    min,
    max,
    step,
    disabled,
    onChange,
    formatValue,
    showMarkers = true,
    markers,
}: EffectSliderProps) {
    const formattedValue = formatValue(value);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-[rgb(var(--color-text))]"
                >
                    {label}
                </label>
                <span
                    className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                    aria-live="polite"
                >
                    {formattedValue}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                aria-label={`${label}: ${formattedValue}`}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
            />
            {showMarkers && markers && (
                <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                    {markers.map((marker, index) => (
                        <span key={index}>{marker}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
