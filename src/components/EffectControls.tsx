import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Waves, Radio, Volume2 } from "lucide-react";

export type EffectMode = "speed-up" | "slow-reverb" | "8d-audio" | "bass-boost";

export interface EffectSettings {
    speedMultiplier: number;
    reverbAmount: number;
    rotationSpeed?: number;
    bassBoostIntensity?: number;
    mode: EffectMode;
}

interface EffectControlsProps {
    onChange: (settings: EffectSettings) => void;
    disabled?: boolean;
}

export function EffectControls({ onChange, disabled }: EffectControlsProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<EffectMode>("speed-up");
    const [speedMultiplier, setSpeedMultiplier] = useState(1.3);
    const [slowSpeed, setSlowSpeed] = useState(0.7);
    const [reverbAmount, setReverbAmount] = useState(0.5);
    const [rotationSpeed, setRotationSpeed] = useState(0.4);
    const [bassBoostIntensity, setBassBoostIntensity] = useState(0.5);

    useEffect(() => {
        if (mode === "speed-up") {
            onChange({ mode: "speed-up", speedMultiplier, reverbAmount: 0 });
        } else if (mode === "slow-reverb") {
            onChange({
                mode: "slow-reverb",
                speedMultiplier: slowSpeed,
                reverbAmount,
            });
        } else if (mode === "8d-audio") {
            onChange({
                mode: "8d-audio",
                speedMultiplier: 1,
                reverbAmount: 0,
                rotationSpeed,
            });
        } else {
            onChange({
                mode: "bass-boost",
                speedMultiplier: 1,
                reverbAmount: 0,
                bassBoostIntensity,
            });
        }
    }, [
        mode,
        speedMultiplier,
        slowSpeed,
        reverbAmount,
        rotationSpeed,
        bassBoostIntensity,
        onChange,
    ]);

    return (
        <div className="space-y-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setMode("speed-up")}
                    disabled={disabled}
                    aria-pressed={mode === "speed-up"}
                    aria-label={t("effects.speedUp")}
                    className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
                mode === "speed-up"
                    ? "bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50"
                    : "border-2 border-transparent"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Zap
                            className={`w-5 h-5 ${
                                mode === "speed-up"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text-secondary))]"
                            }`}
                            aria-hidden="true"
                        />
                        <span
                            className={
                                mode === "speed-up"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text))]"
                            }
                        >
                            {t("effects.speedUp")}
                        </span>
                    </div>
                </button>
                <button
                    onClick={() => setMode("slow-reverb")}
                    disabled={disabled}
                    aria-pressed={mode === "slow-reverb"}
                    aria-label={t("effects.slowReverb")}
                    className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
                mode === "slow-reverb"
                    ? "bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50"
                    : "border-2 border-transparent"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Waves
                            className={`w-5 h-5 ${
                                mode === "slow-reverb"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text-secondary))]"
                            }`}
                            aria-hidden="true"
                        />
                        <span
                            className={
                                mode === "slow-reverb"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text))]"
                            }
                        >
                            {t("effects.slowReverb")}
                        </span>
                    </div>
                </button>
                <button
                    onClick={() => setMode("8d-audio")}
                    disabled={disabled}
                    aria-pressed={mode === "8d-audio"}
                    aria-label={t("effects.8dAudio")}
                    className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
                mode === "8d-audio"
                    ? "bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50"
                    : "border-2 border-transparent"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Radio
                            className={`w-5 h-5 ${
                                mode === "8d-audio"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text-secondary))]"
                            }`}
                            aria-hidden="true"
                        />
                        <span
                            className={
                                mode === "8d-audio"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text))]"
                            }
                        >
                            {t("effects.8dAudio")}
                        </span>
                    </div>
                </button>
                <button
                    onClick={() => setMode("bass-boost")}
                    disabled={disabled}
                    aria-pressed={mode === "bass-boost"}
                    aria-label={t("effects.bassBoost")}
                    className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
                mode === "bass-boost"
                    ? "bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50"
                    : "border-2 border-transparent"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
                >
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Volume2
                            className={`w-5 h-5 ${
                                mode === "bass-boost"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text-secondary))]"
                            }`}
                            aria-hidden="true"
                        />
                        <span
                            className={
                                mode === "bass-boost"
                                    ? "text-[rgb(var(--color-accent))]"
                                    : "text-[rgb(var(--color-text))]"
                            }
                        >
                            {t("effects.bassBoost")}
                        </span>
                    </div>
                </button>
            </div>

            {/* Settings */}
            <div className="glass rounded-2xl p-6">
                {mode === "speed-up" ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                            <label
                                htmlFor="speed-slider"
                                className="text-sm font-medium text-[rgb(var(--color-text))]"
                            >
                                {t("effects.speed")}
                            </label>
                            <span
                                className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                                aria-live="polite"
                            >
                                {speedMultiplier.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="speed-slider"
                            type="range"
                            min="1.1"
                            max="2.0"
                            step="0.1"
                            value={speedMultiplier}
                            onChange={(e) =>
                                setSpeedMultiplier(parseFloat(e.target.value))
                            }
                            disabled={disabled}
                            aria-label={`${t(
                                "effects.speed"
                            )}: ${speedMultiplier.toFixed(1)}x`}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
                        />
                        <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                            <span>1.1x</span>
                            <span>2.0x</span>
                        </div>
                    </div>
                ) : mode === "slow-reverb" ? (
                    <div className="space-y-6">
                        {/* Slow Speed Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                                <label
                                    htmlFor="slow-speed-slider"
                                    className="text-sm font-medium text-[rgb(var(--color-text))]"
                                >
                                    {t("effects.slowSpeed")}
                                </label>
                                <span
                                    className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                                    aria-live="polite"
                                >
                                    {slowSpeed.toFixed(2)}x
                                </span>
                            </div>
                            <input
                                id="slow-speed-slider"
                                type="range"
                                min="0.5"
                                max="0.9"
                                step="0.05"
                                value={slowSpeed}
                                onChange={(e) =>
                                    setSlowSpeed(parseFloat(e.target.value))
                                }
                                disabled={disabled}
                                aria-label={`${t(
                                    "effects.slowSpeed"
                                )}: ${slowSpeed.toFixed(2)}x`}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
                            />
                            <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                                <span>0.50x</span>
                                <span>0.70x</span>
                                <span>0.90x</span>
                            </div>
                        </div>

                        {/* Reverb Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                                <label
                                    htmlFor="reverb-slider"
                                    className="text-sm font-medium text-[rgb(var(--color-text))]"
                                >
                                    {t("effects.reverb")}
                                </label>
                                <span
                                    className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                                    aria-live="polite"
                                >
                                    {Math.round(reverbAmount * 100)}%
                                </span>
                            </div>
                            <input
                                id="reverb-slider"
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.1"
                                value={reverbAmount}
                                onChange={(e) =>
                                    setReverbAmount(parseFloat(e.target.value))
                                }
                                disabled={disabled}
                                aria-label={`${t(
                                    "effects.reverb"
                                )}: ${Math.round(reverbAmount * 100)}%`}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
                            />
                            <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                                <span>10%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                ) : mode === "8d-audio" ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                            <label
                                htmlFor="rotation-slider"
                                className="text-sm font-medium text-[rgb(var(--color-text))]"
                            >
                                {t("effects.rotationSpeed")}
                            </label>
                            <span
                                className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                                aria-live="polite"
                            >
                                {rotationSpeed.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            id="rotation-slider"
                            type="range"
                            min="0.2"
                            max="1.5"
                            step="0.1"
                            value={rotationSpeed}
                            onChange={(e) =>
                                setRotationSpeed(parseFloat(e.target.value))
                            }
                            disabled={disabled}
                            aria-label={`${t(
                                "effects.rotationSpeed"
                            )}: ${rotationSpeed.toFixed(1)}x`}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
                        />
                        <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                            <span>0.2x</span>
                            <span>1.5x</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                            <label
                                htmlFor="bass-slider"
                                className="text-sm font-medium text-[rgb(var(--color-text))]"
                            >
                                {t("effects.bassIntensity")}
                            </label>
                            <span
                                className="text-2xl font-semibold text-[rgb(var(--color-accent))]"
                                aria-live="polite"
                            >
                                {bassBoostIntensity < 0.33
                                    ? t("effects.bassLight")
                                    : bassBoostIntensity < 0.67
                                    ? t("effects.bassNormal")
                                    : t("effects.bassStrong")}
                            </span>
                        </div>
                        <input
                            id="bass-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={bassBoostIntensity}
                            onChange={(e) =>
                                setBassBoostIntensity(
                                    parseFloat(e.target.value)
                                )
                            }
                            disabled={disabled}
                            aria-label={`${t(
                                "effects.bassIntensity"
                            )}: ${Math.round(bassBoostIntensity * 100)}%`}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
                        />
                        <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                            <span>{t("effects.bassLight")}</span>
                            <span>{t("effects.bassStrong")}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
