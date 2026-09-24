import { memo, useCallback, useState, useEffect, useRef } from "react";
import { LightningIcon, WavesIcon, HeadphonesIcon, SpeakerHifiIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion } from "./scenes/motion";
import { EffectSlider } from "./EffectSlider";
import { EffectRow } from "./EffectRow";
import { BeatToggle } from "./BeatToggle";
import { useRadioGroupKeys } from "../hooks/useRadioGroupKeys";
import { EFFECT_DEFAULTS } from "../constants";
import { loadEffectPrefs, saveEffectPrefs, settingsFromPrefs, type EffectPrefs } from "../utils/effectPrefs";
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
    bassUnderwater?: number;
    // Nightcore beat bed (Speed Up only).
    enableBeats?: boolean;
    beatsVolume?: number;
    mode: EffectMode;
}

interface EffectControlsProps {
    onChange: (settings: EffectSettings) => void;
    disabled?: boolean;
}

// Listed effects - Slow + Reverb leads as the signature late-night mood. There is
// no "Original" row: the untouched track ("none") is the *absence* of an active
// effect, reached by powering off whichever effect is currently Active.
// The adjustments area holds one or two sliders depending on the active effect
// (8D Audio shows a single Rotation slider; Slow + Reverb and Bass Boost show
// two). Reserving the two-slider height keeps the whole console the SAME height
// across every effect, so it never resizes - which is what keeps its Y and its
// raked tilt from shifting as you cycle effects. (Speed Up's optional Nightcore
// slider grows past this on demand and simply scrolls; that's a deliberate act.)
const ADJUSTMENTS_MIN_HEIGHT = '13rem';

const EFFECT_DEFS: { mode: EffectMode; icon: Icon; labelKey: string }[] = [
    { mode: "slow-reverb", icon: WavesIcon, labelKey: "effects.slowReverb" },
    { mode: "speed-up", icon: LightningIcon, labelKey: "effects.speedUp" },
    { mode: "8d-audio", icon: HeadphonesIcon, labelKey: "effects.8dAudio" },
    { mode: "bass-boost", icon: SpeakerHifiIcon, labelKey: "effects.bassBoost" },
];
const EFFECT_MODES = EFFECT_DEFS.map((fx) => fx.mode);

export const EffectControls = memo(function EffectControls({ onChange, disabled }: EffectControlsProps) {
    const { t } = useTranslation();
    // Seeded from the remembered console (untouched track on a first visit), and
    // written back on every change - which also makes a remount (the desktop gate
    // flipping during a window drag) come back exactly as it was left.
    const [seed] = useState(loadEffectPrefs);
    const [mode, setMode] = useState<EffectMode>(seed.mode);
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(seed.speedUp);
    const [slowSpeed, setSlowSpeed] = useState<number>(seed.slowSpeed);
    const [reverbAmount, setReverbAmount] = useState<number>(seed.reverbAmount);
    const [rotationSpeed, setRotationSpeed] = useState<number>(seed.rotationSpeed);
    const [bassBoostIntensity, setBassBoostIntensity] = useState<number>(seed.bassBoostIntensity);
    const [bassUnderwater, setBassUnderwater] = useState<number>(seed.bassUnderwater);
    const [enableBeats, setEnableBeats] = useState<boolean>(seed.enableBeats);
    const [beatsVolume, setBeatsVolume] = useState<number>(seed.beatsVolume);

    useEffect(() => {
        const prefs: EffectPrefs = {
            mode,
            speedUp: speedMultiplier,
            slowSpeed,
            reverbAmount,
            rotationSpeed,
            bassBoostIntensity,
            bassUnderwater,
            enableBeats,
            beatsVolume,
        };
        saveEffectPrefs(prefs);
        onChange(settingsFromPrefs(prefs));
    }, [
        mode,
        speedMultiplier,
        slowSpeed,
        reverbAmount,
        rotationSpeed,
        bassBoostIntensity,
        bassUnderwater,
        enableBeats,
        beatsVolume,
        onChange,
    ]);

    // The beats volume slider appears BELOW the toggle, which sits near the bottom
    // of the console's internal scroll area - on short viewports the revealed
    // control would land entirely under the fold and the user would never see it.
    // When the toggle flips on (not on a restored mount), bring it into view.
    const beatsSliderRef = useRef<HTMLDivElement | null>(null);
    const prevEnableBeatsRef = useRef(enableBeats);
    useEffect(() => {
        const was = prevEnableBeatsRef.current;
        prevEnableBeatsRef.current = enableBeats;
        if (!enableBeats || was) return;
        // Optional call: jsdom (tests) doesn't implement scrollIntoView.
        beatsSliderRef.current?.scrollIntoView?.({
            block: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
    }, [enableBeats]);

    // Effects are exclusive: selecting an inactive one makes it Active. Clicking the
    // *already-active* effect powers it off, dropping back to "none" - the untouched
    // track. "Original" is therefore a state, never a row.
    const handleSelect = useCallback((next: EffectMode) => {
        setMode((current) => (current === next ? "none" : next));
    }, []);
    // Arrow keys walk the group like any radiogroup: they select, never toggle off.
    const handleGroupKeys = useRadioGroupKeys(EFFECT_MODES, setMode);

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

    // The slider(s) each mode exposes.
    const D = EFFECT_DEFAULTS;
    const modeSliders: Record<
        Exclude<EffectMode, "none">,
        {
            sliders: {
                id: string;
                label: string;
                value: number;
                onChange: (value: number) => void;
                defaultValue: number;
                min: number;
                max: number;
                step: number;
                formatValue: (value: number) => string;
                markers: string[];
            }[];
        }
    > = {
        "speed-up": {
                sliders: [
                {
                    id: "speed-slider",
                    label: t("effects.speed"),
                    value: speedMultiplier,
                    onChange: setSpeedMultiplier,
                    defaultValue: D.SPEED_UP.DEFAULT,
                    min: D.SPEED_UP.MIN,
                    max: D.SPEED_UP.MAX,
                    step: D.SPEED_UP.STEP,
                    formatValue: (v) => formatSpeedMultiplier(v, 2),
                    markers: [
                        `${D.SPEED_UP.MIN.toFixed(2)}x`,
                        `${D.SPEED_UP.MAX.toFixed(2)}x`,
                    ],
                },
            ],
        },
        "slow-reverb": {
                sliders: [
                {
                    id: "slow-speed-slider",
                    label: t("effects.slowSpeed"),
                    value: slowSpeed,
                    onChange: setSlowSpeed,
                    defaultValue: D.SLOW_REVERB.SPEED_DEFAULT,
                    min: D.SLOW_REVERB.SPEED_MIN,
                    max: D.SLOW_REVERB.SPEED_MAX,
                    step: D.SLOW_REVERB.SPEED_STEP,
                    formatValue: (v) => formatSpeedMultiplier(v, 2),
                    markers: [
                        `${D.SLOW_REVERB.SPEED_MIN.toFixed(2)}x`,
                        `${D.SLOW_REVERB.SPEED_MAX.toFixed(2)}x`,
                    ],
                },
                {
                    id: "reverb-slider",
                    label: t("effects.reverb"),
                    value: reverbAmount,
                    onChange: setReverbAmount,
                    defaultValue: D.SLOW_REVERB.REVERB_DEFAULT,
                    min: D.SLOW_REVERB.REVERB_MIN,
                    max: D.SLOW_REVERB.REVERB_MAX,
                    step: D.SLOW_REVERB.REVERB_STEP,
                    formatValue: formatPercentage,
                    markers: [
                        `${Math.round(D.SLOW_REVERB.REVERB_MIN * 100)}%`,
                        `${Math.round(D.SLOW_REVERB.REVERB_MAX * 100)}%`,
                    ],
                },
            ],
        },
        "8d-audio": {
                sliders: [
                {
                    id: "rotation-slider",
                    label: t("effects.rotationSpeed"),
                    value: rotationSpeed,
                    onChange: setRotationSpeed,
                    defaultValue: D.EIGHT_D_AUDIO.ROTATION_DEFAULT,
                    min: D.EIGHT_D_AUDIO.ROTATION_MIN,
                    max: D.EIGHT_D_AUDIO.ROTATION_MAX,
                    step: D.EIGHT_D_AUDIO.ROTATION_STEP,
                    formatValue: formatSpeedMultiplier,
                    markers: [
                        `${D.EIGHT_D_AUDIO.ROTATION_MIN}x`,
                        `${D.EIGHT_D_AUDIO.ROTATION_MAX}x`,
                    ],
                },
            ],
        },
        "bass-boost": {
                sliders: [
                {
                    id: "bass-slider",
                    label: t("effects.bassIntensity"),
                    value: bassBoostIntensity,
                    onChange: setBassBoostIntensity,
                    defaultValue: D.BASS_BOOST_UI.INTENSITY_DEFAULT,
                    min: D.BASS_BOOST_UI.INTENSITY_MIN,
                    max: D.BASS_BOOST_UI.INTENSITY_MAX,
                    step: D.BASS_BOOST_UI.INTENSITY_STEP,
                    formatValue: () => bassIntensityLabel,
                    markers: [t("effects.bassLight"), t("effects.bassStrong")],
                },
                {
                    id: "underwater-slider",
                    label: t("effects.underwater"),
                    value: bassUnderwater,
                    onChange: setBassUnderwater,
                    defaultValue: D.BASS_BOOST_UI.UNDERWATER_DEFAULT,
                    min: D.BASS_BOOST_UI.UNDERWATER_MIN,
                    max: D.BASS_BOOST_UI.UNDERWATER_MAX,
                    step: D.BASS_BOOST_UI.UNDERWATER_STEP,
                    formatValue: formatPercentage,
                    markers: [
                        t("effects.underwaterSurface"),
                        t("effects.underwaterDeep"),
                    ],
                },
            ],
        },
    };

    const active = mode === "none" ? null : modeSliders[mode];

    return (
        <div className="flex flex-col gap-5">
            {/* Effects - exclusive modes as a radiogroup; the chosen one is checked. */}
            <div className="space-y-2.5">
                <h2 id="effects-title" className="pane-title mb-1">{t("studio.effects")}</h2>
                <div
                    role="radiogroup"
                    aria-labelledby="effects-title"
                    data-own-arrows
                    onKeyDown={handleGroupKeys}
                    className="space-y-2"
                >
                    {EFFECT_DEFS.map((fx, i) => (
                        <EffectRow
                            key={fx.mode}
                            icon={fx.icon}
                            label={t(fx.labelKey)}
                            mode={fx.mode}
                            active={mode === fx.mode}
                            focusable={mode === "none" ? i === 0 : mode === fx.mode}
                            disabled={disabled}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            </div>

            {/* Adjustments - the single clear control(s) for the checked effect.
               Keyed on `mode` so switching re-mounts and the new control eases in:
               motion that signals the state change, not decoration. */}
            <div className="space-y-3">
                <div className="hud-ruler" aria-hidden="true" />
                <div
                    key={mode}
                    style={{ minHeight: ADJUSTMENTS_MIN_HEIGHT }}
                    className="pt-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                >
                    {active ? (
                        <div className="space-y-6">
                            {active.sliders.map((slider) => (
                                <EffectSlider key={slider.id} {...slider} disabled={disabled} />
                            ))}
                            {mode === "speed-up" && (
                                <div className="space-y-4 border-t border-[rgba(var(--color-border),0.4)] pt-5">
                                    <BeatToggle
                                        label={t("effects.nightcoreBeats")}
                                        badge={t("effects.betaBadge")}
                                        pressed={enableBeats}
                                        onToggle={() => setEnableBeats((v) => !v)}
                                        disabled={disabled}
                                    />
                                    {enableBeats && (
                                        <div
                                            ref={beatsSliderRef}
                                            className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
                                        >
                                            <EffectSlider
                                                id="beats-volume-slider"
                                                label={t("effects.beatVolume")}
                                                value={beatsVolume}
                                                onChange={setBeatsVolume}
                                                defaultValue={EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_DEFAULT}
                                                min={EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_MIN}
                                                max={EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_MAX}
                                                step={EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_STEP}
                                                formatValue={formatPercentage}
                                                markers={[
                                                    `${Math.round(EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_MIN * 100)}%`,
                                                    `${Math.round(EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_MAX * 100)}%`,
                                                ]}
                                                disabled={disabled}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="py-2 text-sm text-[rgb(var(--color-text-secondary))]">
                            {t("effects.originalHint")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
});
