import { memo } from 'react';
import { MusicNoteIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { coverUrl } from '../../utils/coverUrl';

interface TrackArtProps {
  title: string;
  cover: Blob | null;
  className?: string;
  iconClassName?: string;
}

/** Stable 0..359 hue from a title, so an untagged track always gets the same tile. */
function hueOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

/**
 * A track's artwork: the embedded cover when the file carries one, otherwise a
 * soft two-tone tile tinted from the title - every song keeps a recognisable
 * face in the list instead of a wall of identical placeholders.
 */
export const TrackArt = memo(function TrackArt({ title, cover, className, iconClassName }: TrackArtProps) {
  const url = coverUrl(cover);
  if (url) {
    return <img src={url} alt="" loading="lazy" decoding="async" className={cn('object-cover', className)} draggable={false} />;
  }
  const h = hueOf(title);
  return (
    <span
      className={cn('grid place-items-center', className)}
      style={{
        background: `radial-gradient(120% 120% at 20% 10%, hsl(${h} 70% 62% / 0.9), transparent 60%), linear-gradient(145deg, hsl(${(h + 40) % 360} 55% 38%), hsl(${(h + 300) % 360} 50% 18%))`,
      }}
      aria-hidden="true"
    >
      <MusicNoteIcon className={cn('text-white/80', iconClassName)} aria-hidden="true" />
    </span>
  );
});
