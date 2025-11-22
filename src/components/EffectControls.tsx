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
      <div className="grid grid-cols-2 gap-5">
        <button
          onClick={() => setMode('speed-up')}
          disabled={disabled}
          className={`
            retro-button relative flex items-center justify-center gap-3 p-7 rounded-2xl
            font-black text-xl uppercase tracking-wider
            transition-all duration-300 shadow-xl
            ${
              mode === 'speed-up'
                ? 'bg-gradient-to-br from-[#ff6ec7] to-[#ff3d8f] text-white shadow-[0_0_30px_rgba(255,110,199,0.6)] scale-105 border-2 border-white/50'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border-2 border-white/20'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Zap className="w-7 h-7" />
          Speed Up
        </button>
        <button
          onClick={() => setMode('slow-reverb')}
          disabled={disabled}
          className={`
            retro-button relative flex items-center justify-center gap-3 p-7 rounded-2xl
            font-black text-xl uppercase tracking-wider
            transition-all duration-300 shadow-xl
            ${
              mode === 'slow-reverb'
                ? 'bg-gradient-to-br from-[#4de8ff] to-[#00a8ff] text-white shadow-[0_0_30px_rgba(77,232,255,0.6)] scale-105 border-2 border-white/50'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border-2 border-white/20'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Waves className="w-7 h-7" />
          Slow+Reverb
        </button>
      </div>

      {/* Effect Settings */}
      <div className="cassette-tape rounded-2xl p-6 border-2 border-white/30">
        {mode === 'speed-up' ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white/80 uppercase tracking-widest">
                Speed
              </label>
              <span className="text-3xl font-black text-[#ff6ec7] drop-shadow-lg">
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
              className="w-full h-4 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#ff6ec7] backdrop-blur"
              style={{
                backgroundImage: `linear-gradient(to right, #ff6ec7 0%, #ff6ec7 ${((speedMultiplier - 1.1) / (2.0 - 1.1)) * 100}%, rgba(255,255,255,0.2) ${((speedMultiplier - 1.1) / (2.0 - 1.1)) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <div className="flex justify-between text-xs font-black text-white/60 uppercase">
              <span>1.1x</span>
              <span>2.0x</span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white/80 uppercase tracking-widest">
                Reverb
              </label>
              <span className="text-3xl font-black text-[#4de8ff] drop-shadow-lg">
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
              className="w-full h-4 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#4de8ff] backdrop-blur"
              style={{
                backgroundImage: `linear-gradient(to right, #4de8ff 0%, #4de8ff ${reverbAmount * 100}%, rgba(255,255,255,0.2) ${reverbAmount * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <div className="flex justify-between text-xs font-black text-white/60 uppercase">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
