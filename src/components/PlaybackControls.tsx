import { useTranslation } from 'react-i18next';
import { Play, Pause, RotateCcw, Download, Volume2 } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  onExport: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  hasAudio: boolean;
  hasProcessed: boolean;
  canExport: boolean;
  isExporting?: boolean;
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
  hasAudio,
  canExport,
  isExporting,
  disabled,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            disabled={disabled || !hasAudio}
            aria-label={isPlaying ? t('playback.pause') : t('playback.play')}
            className={`
              flex-1 min-w-[140px] py-3 rounded-[12px] font-semibold text-[15px]
              ios-button transition-all duration-200 flex items-center justify-center gap-2
              ${
                hasAudio && !disabled
                  ? 'bg-[linear-gradient(120deg,rgba(var(--color-accent),0.95),rgba(var(--color-ambient),0.9))] text-white shadow-[0_10px_30px_-18px_rgba(var(--color-accent),0.6)] cursor-pointer'
                  : 'bg-[rgba(var(--color-border),0.5)] dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" aria-hidden="true" />
                {t('playback.pause')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" aria-hidden="true" />
                {t('playback.play')}
              </>
            )}
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            disabled={disabled || !canExport || isExporting}
            aria-label={isExporting ? t('playback.exporting') : t('playback.export')}
            className={`
              flex-1 min-w-[140px] py-3 rounded-[12px] font-semibold text-[15px]
              ios-button transition-all duration-200 flex items-center justify-center gap-2
              ${
                canExport && !disabled && !isExporting
                  ? 'bg-[linear-gradient(120deg,rgba(var(--color-accent),0.95),rgba(var(--color-ambient),0.9))] text-white shadow-[0_10px_30px_-18px_rgba(var(--color-accent),0.6)] cursor-pointer'
                  : 'bg-[rgba(var(--color-border),0.5)] dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                {t('playback.exporting')}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" aria-hidden="true" />
                {t('playback.export')}
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={disabled}
            aria-label={t('accessibility.resetApp')}
            className={`
              p-3 rounded-[12px]
              ios-button transition-all duration-200
              ${
                !disabled
                  ? 'bg-[rgba(var(--color-border),0.5)] dark:bg-gray-700 text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-border),0.7)] dark:hover:bg-gray-600 cursor-pointer'
                  : 'bg-[rgba(var(--color-border),0.5)] dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Volume */}
        {hasAudio && (
          <div className="mt-5 pt-5 border-t border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[rgb(var(--color-text-secondary))] flex-shrink-0" aria-hidden="true" />
              <label htmlFor="volume-slider" className="sr-only">{t('playback.volume')}</label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                aria-label={`${t('playback.volume')}: ${Math.round(volume * 100)}%`}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-[rgb(var(--color-accent))] bg-[rgba(var(--color-border),0.55)]"
              />
              <span className="text-sm font-medium text-[rgb(var(--color-text))] w-12 text-right" aria-live="polite">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
