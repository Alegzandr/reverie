import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Waves, Radio, Volume2 } from "lucide-react";
import { EffectModeButton } from "./EffectModeButton";
import { EffectSlider } from "./EffectSlider";
import { EFFECT_DEFAULTS } from "../constants";
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

export function EffectControls({ onChange, disabled }: EffectControlsProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<EffectMode>("speed-up");
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

    return (
        <div className="space-y-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <EffectModeButton
                    mode="speed-up"
                    currentMode={mode}
                    icon={Zap}
                    label={t("effects.speedUp")}
                    disabled={disabled}
                    onClick={() => setMode("speed-up")}
                />
                <EffectModeButton
                    mode="slow-reverb"
                    currentMode={mode}
                    icon={Waves}
                    label={t("effects.slowReverb")}
                    disabled={disabled}
                    onClick={() => setMode("slow-reverb")}
                />
                <EffectModeButton
                    mode="8d-audio"
                    currentMode={mode}
                    icon={Radio}
                    label={t("effects.8dAudio")}
                    disabled={disabled}
                    onClick={() => setMode("8d-audio")}
                />
                <EffectModeButton
                    mode="bass-boost"
                    currentMode={mode}
                    icon={Volume2}
                    label={t("effects.bassBoost")}
                    disabled={disabled}
                    onClick={() => setMode("bass-boost")}
                />
            </div>

            {/* Settings */}
            <div className="glass rounded-2xl p-6">
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
                                `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MIN.toFixed(
                                    2
                                )}x`,
                                `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT.toFixed(
                                    2
                                )}x`,
                                `${EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MAX.toFixed(
                                    2
                                )}x`,
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
                                `${Math.round(
                                    EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MIN * 100
                                )}%`,
                                `${Math.round(
                                    EFFECT_DEFAULTS.SLOW_REVERB.REVERB_MAX * 100
                                )}%`,
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
    );
}
