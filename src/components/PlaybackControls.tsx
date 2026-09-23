import { memo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Download, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TransportTimeline } from './TransportTimeline';
import { VolumeControl } from './VolumeControl';
import { SpectrumMeter } from './SpectrumMeter';
import type { PlaybackClock } from '../utils/playbackClock';
import type { RepeatMode } from '../utils/playlistModel';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onExport: () => void;
  repeat: RepeatMode;
  onToggleRepeat: () => void;
  shuffle?: boolean;
  onToggleShuffle?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  /** Playhead position source (effective time) - read by the timeline outside React. */
  clock: PlaybackClock;
  duration: number;
  onSeek: (time: number) => void;
  hasAudio: boolean;
  canExport: boolean;
  isExporting?: boolean;
  disabled?: boolean;
  getAnalyser: () => AnalyserNode | null;
}

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: 'playback.repeatOff',
  all: 'playback.repeatAll',
  one: 'playback.repeatOne',
};

/** A quiet round transport button with its tooltip. */
function TransportButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={pressed ? 'accent' : 'ghost'}
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
          className={cn('shrink-0 disabled:opacity-40', className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The transport dock: previous · play · next lead on the left, the seek bar
 * fills the centre, then shuffle and the three-state repeat (off → playlist →
 * this track), a small live spectrum, the volume, and Export. Memoised - the
 * playhead lives in the clock store, so this only re-renders on real changes.
 */
export const PlaybackControls = memo(function PlaybackControls({
  isPlaying,
  onPlay,
  onStop,
  onExport,
  repeat,
  onToggleRepeat,
  shuffle = false,
  onToggleShuffle,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  volume,
  onVolumeChange,
  clock,
  duration,
  onSeek,
  hasAudio,
  canExport,
  isExporting,
  disabled,
  getAnalyser,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  const playEnabled = hasAudio && !disabled;
  const exportEnabled = canExport && !disabled && !isExporting;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div className="flex items-center gap-4">
      <div className="flex shrink-0 items-center gap-1.5">
        {onPrevious && (
          <TransportButton label={t('playback.previous')} onClick={onPrevious} disabled={disabled || !hasAudio || !hasPrevious}>
            <SkipBack className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true" />
          </TransportButton>
        )}
        <div className="relative shrink-0">
          {/* Audio-reactive halo - punches with the kick (bass + onset). */}
          {playEnabled && <span className="audio-orb-glow pointer-events-none absolute inset-0 z-0" aria-hidden="true" />}
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
              <Pause className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            ) : (
              <Play className="h-[18px] w-[18px] translate-x-[1px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            )}
          </Button>
        </div>
        {onNext && (
          <TransportButton label={t('playback.next')} onClick={onNext} disabled={disabled || !hasAudio || !hasNext}>
            <SkipForward className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true" />
          </TransportButton>
        )}
      </div>

      <TransportTimeline className="min-w-0 flex-1" clock={clock} duration={duration} onSeek={onSeek} disabled={disabled || !hasAudio} />

      <div className="flex shrink-0 items-center gap-1.5">
        {onToggleShuffle && (
          <TransportButton label={t('playback.shuffle')} onClick={onToggleShuffle} disabled={disabled} pressed={shuffle}>
            <Shuffle className={cn('h-[18px] w-[18px]', shuffle && 'text-[rgb(var(--color-accent))]')} aria-hidden="true" />
          </TransportButton>
        )}
        <TransportButton
          label={t(REPEAT_LABEL[repeat])}
          onClick={onToggleRepeat}
          disabled={disabled || !hasAudio}
          pressed={repeat !== 'off'}
        >
          <RepeatIcon className={cn('h-[18px] w-[18px]', repeat !== 'off' && 'text-[rgb(var(--color-accent))]')} aria-hidden="true" />
        </TransportButton>

        {hasAudio && (
          <SpectrumMeter getAnalyser={getAnalyser} isPlaying={isPlaying} className="ml-1 hidden h-8 w-20 shrink-0 xl:block" />
        )}

        {hasAudio && <VolumeControl volume={volume} onVolumeChange={onVolumeChange} disabled={disabled} />}

        {/* Export - the quiet committing action: a glass pill with a mood-tinted icon. */}
        <Button
          variant={exportEnabled ? 'glass' : 'muted'}
          size="pill"
          onClick={onExport}
          disabled={disabled || !canExport || isExporting}
          aria-label={isExporting ? t('playback.exporting') : t('playback.export')}
          className="ml-1 shrink-0 px-5"
        >
          {isExporting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--color-accent))] border-t-transparent" aria-hidden="true" />
          ) : (
            <Download className={cn('h-5 w-5', exportEnabled && 'text-[rgb(var(--color-accent))]')} aria-hidden="true" />
          )}
          <span className="hidden lg:inline">{isExporting ? t('playback.exporting') : t('playback.export')}</span>
        </Button>
      </div>
    </div>
  );
});
