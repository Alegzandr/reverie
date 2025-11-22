import { Play, Pause, RotateCcw, Download, Volume2 } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  onExport: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  hasProcessed: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function PlaybackControls({
  isPlaying,
  onPlay,
  onStop,
  onReset,
  onExport,
  volume,
  onVolumeChange,
  hasProcessed,
  isProcessing,
  disabled,
}: PlaybackControlsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="cassette-tape rounded-2xl p-6 border-2 border-white/30">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Play/Pause Button */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={disabled || !hasProcessed}
            className={`
              retro-button flex items-center justify-center gap-2 px-10 py-5 rounded-xl
              font-black text-lg uppercase tracking-wider
              transition-all duration-300 shadow-xl
              ${
                hasProcessed && !disabled
                  ? 'bg-gradient-to-r from-[#ff6ec7] to-[#b06aff] text-white hover:shadow-[0_0_30px_rgba(255,110,199,0.6)] cursor-pointer'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-7 h-7" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-7 h-7" />
                Play
              </>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={onExport}
            disabled={disabled || !hasProcessed || isProcessing}
            className={`
              retro-button flex items-center justify-center gap-2 px-10 py-5 rounded-xl
              font-black text-lg uppercase tracking-wider
              transition-all duration-300 shadow-xl
              ${
                hasProcessed && !disabled && !isProcessing
                  ? 'bg-gradient-to-r from-[#4de8ff] to-[#00d4ff] text-white hover:shadow-[0_0_30px_rgba(77,232,255,0.6)] cursor-pointer'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-7 h-7" />
            {isProcessing ? 'Exporting...' : 'Export'}
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={disabled}
            className={`
              retro-button flex items-center justify-center p-5 rounded-xl
              font-black transition-all duration-300 shadow-lg
              ${
                !disabled
                  ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer border-2 border-white/20'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed border-2 border-gray-400/20'
              }
            `}
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* Volume Control */}
        {hasProcessed && (
          <div className="mt-8 pt-6 border-t-2 border-white/20">
            <div className="flex items-center gap-4">
              <Volume2 className="w-6 h-6 text-white/80 flex-shrink-0" />
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-3 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#b06aff] backdrop-blur"
                  style={{
                    backgroundImage: `linear-gradient(to right, #b06aff 0%, #b06aff ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>
              <span className="text-sm font-black text-white/90 w-14 text-right drop-shadow">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
