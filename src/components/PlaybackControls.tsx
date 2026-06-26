import { useTranslation } from 'react-i18next';
import { Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransportTimeline } from './TransportTimeline';
import { VolumeControl } from './VolumeControl';
import { SpectrumMeter } from './SpectrumMeter';
import { HudDial } from './hud/HudDial';

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
  getAnalyser: () => AnalyserNode | null;
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
  getAnalyser,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  const playEnabled = hasAudio && !disabled;
  const exportEnabled = canExport && !disabled && !isExporting;

  return (
    // On phones the bar splits into two rows: the timeline takes the full width on
    // top, and the controls (play · volume · export) sit beneath it — otherwise
    // everything is crushed onto one line and the clock collides with the volume.
    // On `sm+` the controls wrapper dissolves (`sm:contents`) and every element
    // rejoins a single flex row, ordered play → timeline → spectrum → volume → export.
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
      {/* Classic timeline — full-width first row on mobile, centre flex on desktop. */}
      <TransportTimeline
        className="order-1 w-full sm:order-2 sm:flex-1"
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        disabled={disabled || !hasAudio}
      />

      <div className="order-2 flex items-center gap-3 sm:order-none sm:contents">
        {/* Play / Pause — the Aurora orb inside a holographic instrument dial whose
            rings rotate while a track plays. A soft ring also pulses outward. */}
        <div className="relative shrink-0 sm:order-1">
          <HudDial
            spinning={playEnabled && isPlaying}
            className="pointer-events-none absolute -inset-[11px] z-0"
          />
          {/* Audio-reactive halo — punches with the kick (bass + onset). Rendered
              whenever the orb is live so the glow eases back down on pause. */}
          {playEnabled && (
            <span className="audio-orb-glow pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
          )}
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

        {/* Live spectrum — a small instrument that makes the bar feel alive.
            Hidden on narrow screens where space is tight. */}
        {hasAudio && (
          <SpectrumMeter
            getAnalyser={getAnalyser}
            isPlaying={isPlaying}
            className="hidden lg:block h-8 w-24 shrink-0 sm:order-3"
          />
        )}

        {/* Volume — compact, scroll to adjust. Pushed to the right edge on the
            mobile controls row; sits inline on desktop. */}
        {hasAudio && (
          <VolumeControl
            volume={volume}
            onVolumeChange={onVolumeChange}
            disabled={disabled}
            className="ml-auto sm:ml-0 sm:order-4"
          />
        )}

        {/* Export — the quiet committing action: a dark glass pill, identity carried
            by the mood-tinted icon (it tracks the active mood's accent) rather than
            a loud fill. */}
        <Button
          variant={exportEnabled ? 'glass' : 'muted'}
          size="pill"
          onClick={onExport}
          disabled={disabled || !canExport || isExporting}
          aria-label={isExporting ? t('playback.exporting') : t('playback.export')}
          className="ml-auto shrink-0 px-4 sm:order-5 sm:ml-0 sm:px-6"
        >
          {isExporting ? (
            <div className="w-5 h-5 border-2 border-[rgb(var(--color-accent))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          ) : (
            <Download
              className={`w-5 h-5 ${exportEnabled ? 'text-[rgb(var(--color-accent))]' : ''}`}
              aria-hidden="true"
            />
          )}
          <span className="hidden sm:inline">{isExporting ? t('playback.exporting') : t('playback.export')}</span>
        </Button>
      </div>
    </div>
  );
}
