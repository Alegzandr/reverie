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
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <div className="flex items-center justify-center gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={disabled || !hasProcessed}
            className={`
              flex items-center justify-center gap-2 px-8 py-4 rounded-xl
              font-semibold text-lg transition-all duration-300
              ${
                hasProcessed && !disabled
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Play Preview
              </>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={onExport}
            disabled={disabled || !hasProcessed || isProcessing}
            className={`
              flex items-center justify-center gap-2 px-8 py-4 rounded-xl
              font-semibold text-lg transition-all duration-300
              ${
                hasProcessed && !disabled && !isProcessing
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-6 h-6" />
            {isProcessing ? 'Exporting...' : 'Export MP3'}
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={disabled}
            className={`
              flex items-center justify-center p-4 rounded-xl
              font-semibold transition-all duration-300
              ${
                !disabled
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* Volume Control */}
        {hasProcessed && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <Volume2 className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
