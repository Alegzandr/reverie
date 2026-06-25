import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Waves, Radio, Volume2, Power } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EffectSlider } from "./EffectSlider";
import { LevelMeter } from "./LevelMeter";
import { EFFECT_DEFAULTS } from "../constants";
import { cn } from "@/lib/utils";
import {
    formatSpeedMultiplier,
    formatPercentage,
    formatBassIntensityLabel,
} from "../utils/formatters";

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

interface EffectRowProps {
    icon: LucideIcon;
    label: string;
    active: boolean;
    disabled?: boolean;
    onSelect: () => void;
    statusLabel: string;
}

/**
 * One effect as a list row (icon + name + live status + power lamp). The effects
 * are exclusive modes, so selecting a row makes it the Active one and the rest
 * read Inactive — state is never carried by colour alone (a Power lamp + a text
 * status back it up). The whole row is the hit target.
 */
function EffectRow({ icon: Icon, label, active, disabled, onSelect, statusLabel }: EffectRowProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
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
                        ? "bg-[rgba(var(--color-accent),0.18)] text-[rgb(var(--color-accent))]"
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
                        active ? "text-[rgb(var(--color-accent))]" : "text-[rgb(var(--color-text-secondary))]"
                    )}
                >
                    {statusLabel}
                </span>
            </span>
            <Power
                className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-[rgb(var(--color-accent))]" : "text-[rgb(var(--color-text-secondary))] opacity-50"
                )}
                aria-hidden="true"
            />
        </button>
    );
}

export function EffectControls({ onChange, disabled }: EffectControlsProps) {
    const { t } = useTranslation();
    // Slow + Reverb leads — the brand's signature late-night mood, and the first
    // effect listed, so the Active row sits at the top on load.
    const [mode, setMode] = useState<EffectMode>("slow-reverb");
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(
        EFFECT_DEFAULTS.SPEED_UP.DEFAULT
    );
    const [slowSpeed, setSlowSpeed] = useState<number>(
        EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT
    );
    const [reverbAmount, setReverbAmount] = useState<number>(
        EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT
    );
    const [rotationSpeed, setRotationSpeed] = useState<number>(
        EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_DEFAULT
    );
    const [bassBoostIntensity, setBassBoostIntensity] = useState<number>(
        EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_DEFAULT
    );

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

    const effects: { mode: EffectMode; icon: LucideIcon; label: string }[] = [
        { mode: "slow-reverb", icon: Waves, label: t("effects.slowReverb") },
        { mode: "speed-up", icon: Zap, label: t("effects.speedUp") },
        { mode: "8d-audio", icon: Radio, label: t("effects.8dAudio") },
        { mode: "bass-boost", icon: Volume2, label: t("effects.bassBoost") },
    ];

    const bassIntensityLabel = formatBassIntensityLabel(
        bassBoostIntensity,
        EFFECT_DEFAULTS.BASS_BOOST_UI.LIGHT_THRESHOLD,
        EFFECT_DEFAULTS.BASS_BOOST_UI.NORMAL_THRESHOLD,
        {
            light: t("effects.bassLight"),
            normal: t("effects.bassNormal"),
            strong: t("effects.bassStrong"),
        }
    );

    // Normalised 0..1 level of the active effect's primary parameter — drives the
    // reactive VU-meter so the readout tracks the setting as you turn it.
    const D = EFFECT_DEFAULTS;
    const norm = (val: number, min: number, max: number) =>
        max > min ? (val - min) / (max - min) : 0;
    const activeLevel =
        mode === "speed-up"
            ? norm(speedMultiplier, D.SPEED_UP.MIN, D.SPEED_UP.MAX)
            : mode === "slow-reverb"
              ? norm(reverbAmount, D.SLOW_REVERB.REVERB_MIN, D.SLOW_REVERB.REVERB_MAX)
              : mode === "8d-audio"
                ? norm(rotationSpeed, D.EIGHT_D_AUDIO.ROTATION_MIN, D.EIGHT_D_AUDIO.ROTATION_MAX)
                : norm(bassBoostIntensity, D.BASS_BOOST_UI.INTENSITY_MIN, D.BASS_BOOST_UI.INTENSITY_MAX);

    return (
        <div className="flex flex-col gap-5">
            {/* Effects — exclusive modes listed as rows; the chosen one is Active. */}
            <div className="space-y-2.5">
                <span className="hud-readout block">{t("studio.effects")}</span>
                <div className="space-y-2">
                    {effects.map((fx) => (
                        <EffectRow
                            key={fx.mode}
                            icon={fx.icon}
                            label={fx.label}
                            active={mode === fx.mode}
                            disabled={disabled}
                            onSelect={() => setMode(fx.mode)}
                            statusLabel={mode === fx.mode ? t("studio.active") : t("studio.inactive")}
                        />
                    ))}
                </div>
            </div>

            {/* Adjustments — the single clear control(s) for the Active effect.
               Keyed on `mode` so switching re-mounts and the new control eases in:
               motion that signals the state change, not decoration. */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <span className="hud-readout">{t("studio.adjustments")}</span>
                    {/* Reactive VU-meter: fills to the active effect's parameter. */}
                    <LevelMeter value={activeLevel} variant="reactive" className="h-4 w-24" />
                </div>
                <div className="hud-ruler" aria-hidden="true" />
                <div
                    key={mode}
                    className="pt-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                >
                    {mode === "speed-up" ? (
                        <EffectSlider
                            id="speed-slider"
                            label={t("effects.speed")}
                            value={speedMultiplier}
                            min={EFFECT_DEFAULTS.SPEED_UP.MIN}
                            max={EFFECT_DEFAULTS.SPEED_UP.MAX}
                            step={EFFECT_DEFAULTS.SPEED_UP.STEP}
                            disabled={disabled}
                            onChange={setSpeedMultiplier}
                            formatValue={formatSpeedMultiplier}
                            markers={[
                                `${EFFECT_DEFAULTS.SPEED_UP.MIN}x`,
                                `${EFFECT_DEFAULTS.SPEED_UP.MAX}x`,
                            ]}
                        />
                    ) : mode === "slow-reverb" ? (
                        <div className="space-y-6">
                            <EffectSlider
                                id="slow-speed-slider"
                                label={t("effects.slowSpeed")}
                                value={slowSpeed}
                                min={EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MIN}
                                max={EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MAX}
                                step={EFFECT_DEFAULTS.SLOW_REVERB.SPEED_STEP}
                                disabled={disabled}
                                onChange={setSlowSpeed}
                                formatValue={(v) => formatSpeedMultiplier(v, 2)}
                                markers={[
                                    `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MIN.toFixed(2)}x`,
                                    `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT.toFixed(2)}x`,
                                    `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MAX.toFixed(2)}x`,
                                ]}
                            />
                            <EffectSlider
                                id="reverb-slider"
                                label={t("effects.reverb")}
                                value={reverbAmount}
                                min={EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MIN}
                                max={EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MAX}
                                step={EFFECT_DEFAULTS.SLOW_REVERB.REVERB_STEP}
                                disabled={disabled}
                                onChange={setReverbAmount}
                                formatValue={formatPercentage}
                                markers={[
                                    `${Math.round(EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MIN * 100)}%`,
                                    `${Math.round(EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MAX * 100)}%`,
                                ]}
                            />
                        </div>
                    ) : mode === "8d-audio" ? (
                        <EffectSlider
                            id="rotation-slider"
                            label={t("effects.rotationSpeed")}
                            value={rotationSpeed}
                            min={EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_MIN}
                            max={EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_MAX}
                            step={EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_STEP}
                            disabled={disabled}
                            onChange={setRotationSpeed}
                            formatValue={formatSpeedMultiplier}
                            markers={[
                                `${EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_MIN}x`,
                                `${EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_MAX}x`,
                            ]}
                        />
                    ) : (
                        <EffectSlider
                            id="bass-slider"
                            label={t("effects.bassIntensity")}
                            value={bassBoostIntensity}
                            min={EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_MIN}
                            max={EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_MAX}
                            step={EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_STEP}
                            disabled={disabled}
                            onChange={setBassBoostIntensity}
                            formatValue={() => bassIntensityLabel}
                            markers={[
                                t("effects.bassLight"),
                                t("effects.bassStrong"),
                            ]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
