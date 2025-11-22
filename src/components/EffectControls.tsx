import { useState, useEffect } from 'react';
import { Zap, Waves } from 'lucide-react';

export interface EffectSettings {
  speedMultiplier: number;
  reverbAmount: number;
}

interface EffectControlsProps {
  onChange: (settings: EffectSettings) => void;
  disabled?: boolean;
}

export function EffectControls({ onChange, disabled }: EffectControlsProps) {
  const [mode, setMode] = useState<'speed-up' | 'slow-reverb'>('speed-up');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.2);
  const [reverbAmount, setReverbAmount] = useState(0.3);

  useEffect(() => {
    if (mode === 'speed-up') {
      onChange({ speedMultiplier, reverbAmount: 0 });
    } else {
      onChange({ speedMultiplier: 0.8, reverbAmount });
    }
  }, [mode, speedMultiplier, reverbAmount, onChange]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setMode('speed-up')}
          disabled={disabled}
          className={`
            relative flex items-center justify-center gap-3 p-6 rounded-xl
            font-semibold text-lg transition-all duration-300
            ${
              mode === 'speed-up'
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Zap className="w-6 h-6" />
          Speed Up
        </button>
        <button
          onClick={() => setMode('slow-reverb')}
          disabled={disabled}
          className={`
            relative flex items-center justify-center gap-3 p-6 rounded-xl
            font-semibold text-lg transition-all duration-300
            ${
              mode === 'slow-reverb'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Waves className="w-6 h-6" />
          Slow + Reverb
        </button>
      </div>

      {/* Effect Settings */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        {mode === 'speed-up' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Speed Multiplier
              </label>
              <span className="text-lg font-bold text-orange-500">
                {speedMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="1.1"
              max="2.0"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1.1x</span>
              <span>2.0x</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Reverb Amount
              </label>
              <span className="text-lg font-bold text-blue-500">
                {Math.round(reverbAmount * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={reverbAmount}
              onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
