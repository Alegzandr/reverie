import { memo } from 'react';
import { PlayIcon, PauseIcon, DownloadSimpleIcon, CheckIcon, RepeatIcon, RepeatOnceIcon, ShuffleIcon, SkipBackIcon, SkipForwardIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  /** False while the selected track couldn't be read: nothing of the previous one plays under its name. */
  canPlay?: boolean;
  canExport: boolean;
  isExporting?: boolean;
  /** Name of the file the last export just saved (cleared after a short while). */
  savedAs?: string | null;
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
  canPlay = true,
  canExport,
  isExporting,
  savedAs = null,
  disabled,
  getAnalyser,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  const playEnabled = hasAudio && canPlay && !disabled;
  const exportEnabled = canExport && !disabled && !isExporting;
  const RepeatGlyph = repeat === 'one' ? RepeatOnceIcon : RepeatIcon;

  return (
    <div className="flex items-center gap-4">
      <div className="flex shrink-0 items-center gap-1.5">
        {onPrevious && (
          <TransportButton label={t('playback.previous')} onClick={onPrevious} disabled={disabled || !hasAudio || !hasPrevious}>
            <SkipBackIcon className="h-[18px] w-[18px]" weight="fill" aria-hidden="true" />
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
            disabled={!playEnabled}
            aria-label={isPlaying ? t('playback.pause') : t('playback.play')}
            className="relative h-12 w-12"
          >
            {isPlaying ? (
              <PauseIcon className="h-[18px] w-[18px]" weight="fill" aria-hidden="true" />
            ) : (
              <PlayIcon className="h-[18px] w-[18px] translate-x-[1px]" weight="fill" aria-hidden="true" />
            )}
          </Button>
        </div>
        {onNext && (
          <TransportButton label={t('playback.next')} onClick={onNext} disabled={disabled || !hasAudio || !hasNext}>
            <SkipForwardIcon className="h-[18px] w-[18px]" weight="fill" aria-hidden="true" />
          </TransportButton>
        )}
      </div>

      <TransportTimeline className="min-w-0 flex-1" clock={clock} duration={duration} onSeek={onSeek} disabled={disabled || !hasAudio || !canPlay} />

      <div className="flex shrink-0 items-center gap-4">
        {/* Play-order modes, then the output (meter + level), then Export: three
            groups spaced like the lead cluster, so the rail reads in phrases. */}
        <div className="flex items-center gap-1.5">
          {onToggleShuffle && (
            <TransportButton label={t('playback.shuffle')} onClick={onToggleShuffle} disabled={disabled} pressed={shuffle}>
              <ShuffleIcon className={cn('h-[18px] w-[18px]', shuffle && 'text-[rgb(var(--color-accent-text))]')} aria-hidden="true" />
            </TransportButton>
          )}
          <TransportButton
            label={t(REPEAT_LABEL[repeat])}
            onClick={onToggleRepeat}
            disabled={disabled || !hasAudio}
            pressed={repeat !== 'off'}
          >
            <RepeatGlyph className={cn('h-[18px] w-[18px]', repeat !== 'off' && 'text-[rgb(var(--color-accent-text))]')} aria-hidden="true" />
          </TransportButton>
        </div>

        {hasAudio && (
          <div className="flex items-center gap-1">
            <SpectrumMeter getAnalyser={getAnalyser} isPlaying={isPlaying} className="hidden h-6 w-20 shrink-0 xl:block" />
            <VolumeControl volume={volume} onVolumeChange={onVolumeChange} disabled={disabled} />
          </div>
        )}

        {/* Export - the quiet committing action: a glass pill with a mood-tinted icon.
            It answers in place: a spinner while it renders, then "Saved" and the
            file's name (tooltip + a polite announcement) for a few seconds. */}
        <Tooltip open={!!savedAs}>
          <TooltipTrigger asChild>
            <Button
              variant={exportEnabled ? 'glass' : 'muted'}
              size="icon"
              onClick={onExport}
              disabled={disabled || !canExport || isExporting}
              aria-label={isExporting ? t('playback.exporting') : t('playback.export')}
              className="w-auto shrink-0 px-4 text-sm"
            >
              {isExporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgb(var(--color-accent))] border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
              ) : savedAs ? (
                <CheckIcon className="h-[18px] w-[18px] text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
              ) : (
                <DownloadSimpleIcon className={cn('h-[18px] w-[18px]', exportEnabled && 'text-[rgb(var(--color-accent-text))]')} aria-hidden="true" />
              )}
              <span className="hidden lg:inline">
                {isExporting ? t('playback.exporting') : savedAs ? t('playback.saved') : t('playback.export')}
              </span>
            </Button>
          </TooltipTrigger>
          {savedAs && <TooltipContent>{savedAs}</TooltipContent>}
        </Tooltip>
        <span className="sr-only" role="status">
          {isExporting ? t('playback.exporting') : savedAs ? t('playback.savedAs', { name: savedAs }) : ''}
        </span>
      </div>
    </div>
  );
});
