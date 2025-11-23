import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

interface WaveformTimelineProps {
  originalBuffer?: AudioBuffer | null;
  processedBuffer?: AudioBuffer | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
}

const BAR_COUNT = 96;

function buildWaveform(buffer?: AudioBuffer | null, bars = BAR_COUNT): number[] {
  if (!buffer) return Array(bars).fill(0);
  const channelData = buffer.getChannelData(0);
  const samplesPerBar = Math.max(1, Math.floor(channelData.length / bars));

  return new Array(bars).fill(0).map((_, bar) => {
    const start = bar * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += Math.abs(channelData[i]);
    }
    const avg = sum / (end - start);
    return Math.min(1, Math.sqrt(avg));
  });
}

export function WaveformTimeline({
  originalBuffer,
  processedBuffer,
  duration,
  currentTime,
  isPlaying,
  onSeek,
}: WaveformTimelineProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rawWaveform = useMemo(
    () => buildWaveform(originalBuffer),
    [originalBuffer]
  );
  const fxWaveform = useMemo(
    () => buildWaveform(processedBuffer),
    [processedBuffer]
  );

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    onSeek(clampedRatio * duration);
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
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">
              {t('waveform.caption')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">
            {isPlaying ? t('waveform.playing') : t('waveform.idle')}
          </p>
          <p className="text-sm font-semibold text-[rgb(var(--color-text))]">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </p>
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
          <WaveformRow label={t('waveform.raw')} bars={rawWaveform} accentVar="--color-ambient" />
          <WaveformRow label={t('waveform.fx')} bars={fxWaveform} accentVar="--color-accent" />
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
}: {
  label: string;
  bars: number[];
  accentVar: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase font-semibold tracking-wide text-[rgb(var(--color-text-secondary))] w-12">
        {label}
      </span>
      <div className="flex-1 flex items-end gap-[3px] h-16 overflow-hidden">
        {bars.map((bar, index) => (
          <div
            key={index}
            className="flex-1 rounded-[12px] bg-[rgba(var(--color-border),0.35)] relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
            style={{ minWidth: '3px', maxWidth: '8px', height: '100%' }}
            aria-hidden="true"
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-[10px] origin-bottom transition-[height] duration-150 ease-out"
              style={{
                height: `${Math.max(8, bar * 100)}%`,
                background: `linear-gradient(180deg, rgba(var(${accentVar}),0.95) 0%, rgba(var(${accentVar}),0.5) 70%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.4), rgba(var(${accentVar}),0.25))`,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
