import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Waves, Box } from 'lucide-react';

export type EffectMode = 'speed-up' | 'slow-reverb' | '8-bit';

export interface EffectSettings {
  speedMultiplier: number;
  reverbAmount: number;
  bitDepth?: number;
  sampleRateReduction?: number;
  mode: EffectMode;
}

interface EffectControlsProps {
  onChange: (settings: EffectSettings) => void;
  disabled?: boolean;
}

export function EffectControls({ onChange, disabled }: EffectControlsProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<EffectMode>('speed-up');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.2);
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [bitDepth, setBitDepth] = useState(6);
  const [sampleRateReduction, setSampleRateReduction] = useState(6);

  useEffect(() => {
    if (mode === 'speed-up') {
      onChange({ mode: 'speed-up', speedMultiplier, reverbAmount: 0 });
    } else if (mode === 'slow-reverb') {
      onChange({ mode: 'slow-reverb', speedMultiplier: 0.8, reverbAmount });
    } else {
      onChange({ mode: '8-bit', speedMultiplier: 1, reverbAmount: 0, bitDepth, sampleRateReduction });
    }
  }, [mode, speedMultiplier, reverbAmount, bitDepth, sampleRateReduction, onChange]);

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setMode('speed-up')}
          disabled={disabled}
          aria-pressed={mode === 'speed-up'}
          aria-label={t('effects.speedUp')}
          className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
              mode === 'speed-up'
                ? 'bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50'
                : 'border-2 border-transparent'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <Zap className={`w-5 h-5 ${mode === 'speed-up' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text-secondary))]'}`} aria-hidden="true" />
            <span className={mode === 'speed-up' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text))]'}>
              {t('effects.speedUp')}
            </span>
          </div>
        </button>
        <button
          onClick={() => setMode('slow-reverb')}
          disabled={disabled}
          aria-pressed={mode === 'slow-reverb'}
          aria-label={t('effects.slowReverb')}
          className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
              mode === 'slow-reverb'
                ? 'bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50'
                : 'border-2 border-transparent'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <Waves className={`w-5 h-5 ${mode === 'slow-reverb' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text-secondary))]'}`} aria-hidden="true" />
            <span className={mode === 'slow-reverb' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text))]'}>
              {t('effects.slowReverb')}
            </span>
          </div>
        </button>
        <button
          onClick={() => setMode('8-bit')}
          disabled={disabled}
          aria-pressed={mode === '8-bit'}
          aria-label={t('effects.8bit')}
          className={`
            glass rounded-[14px] px-4 py-4
            font-medium text-[14px]
            ios-button transition-all duration-200
            ${
              mode === '8-bit'
                ? 'bg-[rgb(var(--color-accent))]/10 border-2 border-[rgb(var(--color-accent))]/50'
                : 'border-2 border-transparent'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <Box className={`w-5 h-5 ${mode === '8-bit' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text-secondary))]'}`} aria-hidden="true" />
            <span className={mode === '8-bit' ? 'text-[rgb(var(--color-accent))]' : 'text-[rgb(var(--color-text))]'}>
              {t('effects.8bit')}
            </span>
          </div>
        </button>
      </div>

      {/* Settings */}
      <div className="glass rounded-2xl p-6">
        {mode === 'speed-up' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="speed-slider" className="text-sm font-medium text-[rgb(var(--color-text))]">
                {t('effects.speed')}
              </label>
              <span className="text-2xl font-semibold text-[rgb(var(--color-accent))]" aria-live="polite">
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
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              disabled={disabled}
              aria-label={`${t('effects.speed')}: ${speedMultiplier.toFixed(1)}x`}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
            />
            <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
              <span>1.1x</span>
              <span>2.0x</span>
            </div>
          </div>
        ) : mode === 'slow-reverb' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="reverb-slider" className="text-sm font-medium text-[rgb(var(--color-text))]">
                {t('effects.reverb')}
              </label>
              <span className="text-2xl font-semibold text-[rgb(var(--color-accent))]" aria-live="polite">
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
              onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
              disabled={disabled}
              aria-label={`${t('effects.reverb')}: ${Math.round(reverbAmount * 100)}%`}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
            />
            <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bit Depth */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="bitdepth-slider" className="text-sm font-medium text-[rgb(var(--color-text))]">
                  {t('effects.bitDepth')}
                </label>
                <span className="text-2xl font-semibold text-[rgb(var(--color-accent))]" aria-live="polite">
                  {bitDepth}-bit
                </span>
              </div>
              <input
              id="bitdepth-slider"
              type="range"
              min="4"
              max="12"
              step="1"
              value={bitDepth}
              onChange={(e) => setBitDepth(parseFloat(e.target.value))}
              disabled={disabled}
              aria-label={`${t('effects.bitDepth')}: ${bitDepth}-bit`}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
            />
              <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                <span>4-bit</span>
                <span>12-bit</span>
              </div>
            </div>

            {/* Sample Rate Reduction */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="samplerate-slider" className="text-sm font-medium text-[rgb(var(--color-text))]">
                  {t('effects.sampleRate')}
                </label>
                <span className="text-2xl font-semibold text-[rgb(var(--color-accent))]" aria-live="polite">
                  /{sampleRateReduction}
                </span>
              </div>
              <input
              id="samplerate-slider"
              type="range"
              min="1"
              max="8"
              step="1"
              value={sampleRateReduction}
              onChange={(e) => setSampleRateReduction(parseFloat(e.target.value))}
              disabled={disabled}
              aria-label={`${t('effects.sampleRate')}: /${sampleRateReduction}`}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
            />
              <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                <span>Full</span>
                <span>1/8th</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
