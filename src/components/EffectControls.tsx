import { memo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Waves, Radio, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EffectSlider } from "./EffectSlider";
import { EffectRow } from "./EffectRow";
import { LevelMeter } from "./LevelMeter";
import { EFFECT_DEFAULTS } from "../constants";
import {
    formatSpeedMultiplier,
    formatPercentage,
    formatBassIntensityLabel,
} from "../utils/formatters";

export type EffectMode =
    | "none"
    | "speed-up"
    | "slow-reverb"
    | "8d-audio"
    | "bass-boost";

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
    // Seeds the internal state on mount. Lets a parent restore the live settings
    // when this component is remounted (e.g. the desktop gate flips during a
    // window drag), instead of snapping back to the slow-reverb defaults.
    initialSettings?: EffectSettings;
}

// Listed effects - Slow + Reverb leads as the signature late-night mood. There is
// no "Original" row: the untouched track ("none") is the *absence* of an active
// effect, reached by powering off whichever effect is currently Active.
const EFFECT_DEFS: { mode: EffectMode; icon: LucideIcon; labelKey: string }[] = [
    { mode: "slow-reverb", icon: Waves, labelKey: "effects.slowReverb" },
    { mode: "speed-up", icon: Zap, labelKey: "effects.speedUp" },
    { mode: "8d-audio", icon: Radio, labelKey: "effects.8dAudio" },
    { mode: "bass-boost", icon: Volume2, labelKey: "effects.bassBoost" },
];

export const EffectControls = memo(function EffectControls({ onChange, disabled, initialSettings }: EffectControlsProps) {
    const { t } = useTranslation();
    // Slow + Reverb leads - the brand's signature late-night mood, and the first
    // effect listed, so the Active row sits at the top on load. `initialSettings`
    // (when provided) overrides these seeds for the active mode's parameters so a
    // remount restores the live values instead of resetting to defaults.
    const [mode, setMode] = useState<EffectMode>(
        initialSettings?.mode ?? "slow-reverb"
    );
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(
        initialSettings?.mode === "speed-up"
            ? initialSettings.speedMultiplier
            : EFFECT_DEFAULTS.SPEED_UP.DEFAULT
    );
    const [slowSpeed, setSlowSpeed] = useState<number>(
        initialSettings?.mode === "slow-reverb"
            ? initialSettings.speedMultiplier
            : EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT
    );
    const [reverbAmount, setReverbAmount] = useState<number>(
        initialSettings?.mode === "slow-reverb"
            ? initialSettings.reverbAmount
            : EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT
    );
    const [rotationSpeed, setRotationSpeed] = useState<number>(
        initialSettings?.rotationSpeed ??
            EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_DEFAULT
    );
    const [bassBoostIntensity, setBassBoostIntensity] = useState<number>(
        initialSettings?.bassBoostIntensity ??
            EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_DEFAULT
    );

    useEffect(() => {
        if (mode === "none") {
            // Bypass: play the untouched track - no time-stretch, no reverb, no spatialiser.
            onChange({ mode: "none", speedMultiplier: 1, reverbAmount: 0 });
        } else if (mode === "speed-up") {
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

    // Effects are exclusive: selecting an inactive one makes it Active. Clicking the
    // *already-active* effect powers it off, dropping back to "none" - the untouched
    // track. "Original" is therefore a state, never a row.
    const handleSelect = (next: EffectMode) => {
        setMode((current) => (current === next ? "none" : next));
    };

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

    // Normalised 0..1 level of the active effect's primary parameter - drives the
    // reactive VU-meter so the readout tracks the setting as you turn it.
    const D = EFFECT_DEFAULTS;
    const norm = (val: number, min: number, max: number) =>
        max > min ? (val - min) / (max - min) : 0;
    const activeLevel =
        mode === "none"
            ? 0
            : mode === "speed-up"
            ? norm(speedMultiplier, D.SPEED_UP.MIN, D.SPEED_UP.MAX)
            : mode === "slow-reverb"
              ? norm(reverbAmount, D.SLOW_REVERB.REVERB_MIN, D.SLOW_REVERB.REVERB_MAX)
              : mode === "8d-audio"
                ? norm(rotationSpeed, D.EIGHT_D_AUDIO.ROTATION_MIN, D.EIGHT_D_AUDIO.ROTATION_MAX)
                : norm(bassBoostIntensity, D.BASS_BOOST_UI.INTENSITY_MIN, D.BASS_BOOST_UI.INTENSITY_MAX);

    return (
        <div className="flex flex-col gap-5">
            {/* Effects - exclusive modes listed as rows; the chosen one is Active. */}
            <div className="space-y-2.5">
                <span className="hud-readout block">{t("studio.effects")}</span>
                <div className="space-y-2">
                    {EFFECT_DEFS.map((fx) => (
                        <EffectRow
                            key={fx.mode}
                            icon={fx.icon}
                            label={t(fx.labelKey)}
                            mode={fx.mode}
                            active={mode === fx.mode}
                            disabled={disabled}
                            onSelect={handleSelect}
                            statusLabel={mode === fx.mode ? t("studio.active") : t("studio.inactive")}
                        />
                    ))}
                </div>
            </div>

            {/* Adjustments - the single clear control(s) for the Active effect.
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
                    {mode === "none" ? (
                        <p className="py-2 text-sm text-[rgb(var(--color-text-secondary))]">
                            {t("effects.originalHint")}
                        </p>
                    ) : mode === "speed-up" ? (
                        <EffectSlider
                            id="speed-slider"
                            label={t("effects.speed")}
                            value={speedMultiplier}
                            defaultValue={EFFECT_DEFAULTS.SPEED_UP.DEFAULT}
                            min={EFFECT_DEFAULTS.SPEED_UP.MIN}
                            max={EFFECT_DEFAULTS.SPEED_UP.MAX}
                            step={EFFECT_DEFAULTS.SPEED_UP.STEP}
                            disabled={disabled}
                            onChange={setSpeedMultiplier}
                            formatValue={(v) => formatSpeedMultiplier(v, 2)}
                            markers={[
                                `${EFFECT_DEFAULTS.SPEED_UP.MIN.toFixed(2)}x`,
                                `${EFFECT_DEFAULTS.SPEED_UP.MAX.toFixed(2)}x`,
                            ]}
                        />
                    ) : mode === "slow-reverb" ? (
                        <div className="space-y-6">
                            <EffectSlider
                                id="slow-speed-slider"
                                label={t("effects.slowSpeed")}
                                value={slowSpeed}
                                defaultValue={EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT}
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
                                defaultValue={EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT}
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
                            defaultValue={EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_DEFAULT}
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
                            defaultValue={EFFECT_DEFAULTS.BASS_BOOST_UI.INTENSITY_DEFAULT}
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
});
