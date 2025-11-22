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
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={disabled || !hasProcessed}
            className={`
              flex-1 min-w-[140px] py-3 rounded-[12px] font-semibold text-[15px]
              ios-button transition-all duration-200 flex items-center justify-center gap-2
              ${
                hasProcessed && !disabled
                  ? 'bg-[rgb(var(--color-accent))] text-white hover:bg-[rgb(var(--color-accent-hover))] cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Play
              </>
            )}
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            disabled={disabled || !hasProcessed || isProcessing}
            className={`
              flex-1 min-w-[140px] py-3 rounded-[12px] font-semibold text-[15px]
              ios-button transition-all duration-200 flex items-center justify-center gap-2
              ${
                hasProcessed && !disabled && !isProcessing
                  ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-5 h-5" />
            {isProcessing ? 'Exporting...' : 'Export'}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={disabled}
            className={`
              p-3 rounded-[12px]
              ios-button transition-all duration-200
              ${
                !disabled
                  ? 'bg-gray-200 dark:bg-gray-700 text-[rgb(var(--color-text))] hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        {hasProcessed && (
          <div className="mt-5 pt-5 border-t border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[rgb(var(--color-text-secondary))] flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))]"
              />
              <span className="text-sm font-medium text-[rgb(var(--color-text))] w-12 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
