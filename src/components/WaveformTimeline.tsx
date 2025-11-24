import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Waves } from 'lucide-react';
import { WAVEFORM } from '../constants';
import { useWaveform } from '../hooks/useWaveform';

interface WaveformTimelineProps {
  originalBuffer?: AudioBuffer | null;
  processedBuffer?: AudioBuffer | null;
  longestDuration: number;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  selectedTrack: 'raw' | 'fx';
  onSelectTrack: (track: 'raw' | 'fx') => void;
  onSeek: (time: number, bufferOverride?: AudioBuffer | null) => void;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function WaveformTimeline({
  originalBuffer,
  processedBuffer,
  longestDuration,
  duration,
  currentTime,
  isPlaying,
  selectedTrack,
  onSelectTrack,
  onSeek,
}: WaveformTimelineProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const longest = Math.max(longestDuration || 0, duration || 0, processedBuffer?.duration || 0, originalBuffer?.duration || 0, 1);
  const rawBars = Math.max(WAVEFORM.MIN_BAR_COUNT, Math.round((originalBuffer?.duration || longest) / longest * WAVEFORM.BAR_COUNT));
  const fxBars = Math.max(WAVEFORM.MIN_BAR_COUNT, Math.round((processedBuffer?.duration || longest) / longest * WAVEFORM.BAR_COUNT));

  const { bars: rawWaveform } = useWaveform({ buffer: originalBuffer, bars: rawBars });
  const { bars: fxWaveform } = useWaveform({ buffer: processedBuffer, bars: fxBars });

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    const bufferOverride = selectedTrack === 'fx' ? processedBuffer : originalBuffer;
    onSeek(clampedRatio * duration, bufferOverride || undefined);
  };

  const playhead = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="glass rounded-3xl p-4 sm:p-5 space-y-4 bg-[linear-gradient(145deg,rgba(var(--color-surface),0.95),rgba(var(--color-ambient),0.08))] shadow-[0_20px_70px_-40px_rgba(var(--color-accent),0.6)] border border-[rgba(var(--color-border),0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[rgb(var(--color-accent))]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-text))]">
              {t('waveform.title')}
            </p>
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
              <Waves className="w-4 h-4" aria-hidden="true" />
              <span>{t('waveform.caption')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">
              {isPlaying ? t('waveform.playing') : t('waveform.idle')}
            </p>
            <p className="text-sm font-semibold text-[rgb(var(--color-text))]" aria-live="polite">
              {formatClock(currentTime)} / {formatClock(duration)}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        data-testid="waveform-timeline"
        className="relative cursor-pointer group rounded-2xl overflow-hidden"
        role="presentation"
        aria-label={t('waveform.scrub')}
        onClick={handleSeek}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-ambient),0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(var(--color-accent),0.14),transparent_40%),linear-gradient(115deg,rgba(var(--color-surface),0.9),rgba(var(--color-surface),0.75))]" />
        <div className="relative space-y-3 py-3">
          <WaveformRow
            label={t('waveform.raw')}
            bars={rawWaveform}
            accentVar="--color-ambient"
            active={selectedTrack === 'raw'}
            playing={selectedTrack === 'raw' && isPlaying}
            onSelect={() => onSelectTrack('raw')}
            widthPercent={Math.min(100, (rawBars / WAVEFORM.BAR_COUNT) * 100)}
          />
          {processedBuffer && (
            <WaveformRow
              label={t('waveform.fx')}
              bars={fxWaveform}
              accentVar="--color-accent"
              active={selectedTrack === 'fx'}
              playing={selectedTrack === 'fx' && isPlaying}
              onSelect={() => onSelectTrack('fx')}
              widthPercent={Math.min(100, (fxBars / WAVEFORM.BAR_COUNT) * 100)}
            />
          )}
        </div>
        <div
          className="absolute top-0 bottom-0 w-[3px] bg-[rgb(var(--color-accent))] rounded-full shadow-[0_0_0_10px_rgba(var(--color-accent),0.12)]"
          style={{ left: `${playhead}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.18)] shadow-[0_10px_35px_-18px_rgba(var(--color-accent),0.9)] transition-transform duration-150"
          style={{ left: `calc(${playhead}% - 12px)` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function WaveformRow({
  label,
  bars,
  accentVar,
  active,
  playing,
  onSelect,
  widthPercent,
}: {
  label: string;
  bars: number[];
  accentVar: string;
  active: boolean;
  playing: boolean;
  onSelect: () => void;
  widthPercent?: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full text-left transition-all duration-150 ${
        active ? 'opacity-100' : 'opacity-70 hover:opacity-95'
      } ${playing ? 'ring-1 ring-[rgba(var(--color-accent),0.4)]' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      <span className="text-[11px] uppercase font-semibold tracking-tight text-[rgb(var(--color-text-secondary))] w-14">
        {label}
      </span>
      <div
        className="flex-1 flex items-end gap-[3px] h-16 overflow-hidden"
        style={{ maxWidth: widthPercent ? `${widthPercent}%` : undefined }}
      >
        {bars.map((bar, index) => (
          <div
            key={index}
            className={`flex-1 rounded-[12px] relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] ${
              active ? 'bg-[rgba(var(--color-border),0.35)]' : 'bg-[rgba(var(--color-border),0.2)]'
            }`}
            style={{ minWidth: '3px', maxWidth: '8px', height: '100%' }}
            aria-hidden="true"
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-[10px] origin-bottom transition-[height] duration-150 ease-out"
              style={{
                height: `${Math.max(WAVEFORM.MIN_BAR_HEIGHT_PERCENT, bar * 100)}%`,
                background: `linear-gradient(180deg, rgba(var(${accentVar}),${active ? 0.95 : 0.55}) 0%, rgba(var(${accentVar}),${active ? 0.5 : 0.3}) 70%, rgba(255,255,255,0.08) 100%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.35), rgba(var(${accentVar}),0.2))`,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </button>
  );
}
