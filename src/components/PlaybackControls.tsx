import { useTranslation } from 'react-i18next';
import { Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransportTimeline } from './TransportTimeline';
import { VolumeControl } from './VolumeControl';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  hasAudio: boolean;
  canExport: boolean;
  isExporting?: boolean;
  disabled?: boolean;
}

/**
 * Transport bar: play/pause leads on the left, the classic timeline fills the centre,
 * and volume + export sit compactly on the right.
 */
export function PlaybackControls({
  isPlaying,
  onPlay,
  onStop,
  onExport,
  volume,
  onVolumeChange,
  currentTime,
  duration,
  onSeek,
  hasAudio,
  canExport,
  isExporting,
  disabled,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  const playEnabled = hasAudio && !disabled;
  const exportEnabled = canExport && !disabled && !isExporting;

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {/* Play / Pause — the Aurora orb. A soft ring pulses outward while playing. */}
      <div className="relative shrink-0">
        {playEnabled && isPlaying && (
          <span className="play-pulse pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
        )}
        <Button
          variant={playEnabled ? 'play' : 'muted'}
          size="icon"
          onClick={isPlaying ? onStop : onPlay}
          disabled={disabled || !hasAudio}
          aria-label={isPlaying ? t('playback.pause') : t('playback.play')}
          className="relative h-12 w-12"
        >
          {isPlaying ? (
            <Pause className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Play className="w-[18px] h-[18px] translate-x-[1px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Classic timeline */}
      <TransportTimeline
        className="flex-1"
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        disabled={disabled || !hasAudio}
      />

      {/* Volume — compact, scroll to adjust */}
      {hasAudio && (
        <VolumeControl volume={volume} onVolumeChange={onVolumeChange} disabled={disabled} />
      )}

      {/* Export — the quiet committing action: a dark glass pill, identity carried
          by the Aurora-tinted icon rather than a loud fill. */}
      <Button
        variant={exportEnabled ? 'glass' : 'muted'}
        size="pill"
        onClick={onExport}
        disabled={disabled || !canExport || isExporting}
        aria-label={isExporting ? t('playback.exporting') : t('playback.export')}
        className="shrink-0 px-4 sm:px-6"
      >
        {isExporting ? (
          <div className="w-5 h-5 border-2 border-[rgb(var(--aurora-violet))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <Download
            className={`w-5 h-5 ${exportEnabled ? 'text-[rgb(var(--aurora-violet))]' : ''}`}
            aria-hidden="true"
          />
        )}
        <span className="hidden sm:inline">{isExporting ? t('playback.exporting') : t('playback.export')}</span>
      </Button>
    </div>
  );
}
