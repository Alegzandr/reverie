import { Slider } from "@/components/ui/slider";

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
    markers?: string[];
}

/**
 * One clear control per effect. The track fills with the Aurora accent up to the
 * current value (driven by the --range custom property), and the value is rendered
 * large so the result, not the mechanism, leads.
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
    markers,
}: EffectSliderProps) {
    const formattedValue = formatValue(value);

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-[rgb(var(--color-text-secondary))]"
                >
                    {label}
                </label>
                <span
                    className="text-2xl font-semibold tabular-nums text-[rgb(var(--color-accent-text))]"
                    aria-live="polite"
                >
                    {formattedValue}
                </span>
            </div>
            <Slider
                id={id}
                min={min}
                max={max}
                step={step}
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                aria-label={`${label}: ${formattedValue}`}
            />
            {markers && (
                <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                    {markers.map((marker, index) => (
                        <span key={index}>{marker}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
