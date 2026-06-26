import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { AUDIO_PROCESSING } from '@/constants';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
  className?: string;
}

const WHEEL_STEP = 0.05;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compact transport volume: an icon that reflects the level plus a short slider.
 * The whole control is a wheel target, so scrolling anywhere over it (a generous
 * hit area, not just the thin track) nudges the volume without scrolling the page.
 */
export function VolumeControl({ volume, onVolumeChange, disabled, className = '' }: VolumeControlProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest props in refs so the native wheel listener is attached once.
  const volumeRef = useRef(volume);
  const changeRef = useRef(onVolumeChange);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    volumeRef.current = volume;
    changeRef.current = onVolumeChange;
    disabledRef.current = disabled;
  }, [volume, onVolumeChange, disabled]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Native listener with passive:false so we can stop the page from scrolling.
    const handleWheel = (event: WheelEvent) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const next = round2(clamp01(volumeRef.current + direction * WHEEL_STEP));
      if (next !== volumeRef.current) changeRef.current(next);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const percent = Math.round(volume * 100);

  return (
    <div
      ref={wrapperRef}
      className={`flex items-center gap-2 px-2 py-2 rounded-full hover:bg-[rgba(var(--color-border),0.3)] transition-colors ${className}`}
      title={`${t('playback.volume')}: ${percent}%`}
    >
      <VolumeIcon className="w-4 h-4 text-[rgb(var(--color-text-secondary))] shrink-0" aria-hidden="true" />
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onValueChange={(v) => onVolumeChange(round2(v))}
        onDoubleClick={() => {
          if (!disabled) onVolumeChange(AUDIO_PROCESSING.DEFAULT_VOLUME);
        }}
        disabled={disabled}
        aria-label={`${t('playback.volume')}: ${percent}%`}
        title={t('effects.resetHint')}
        className="w-20 sm:w-24"
      />
    </div>
  );
}
