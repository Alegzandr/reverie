import { memo, useLayoutEffect, useRef } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '../../utils/formatters';
import type { PlaylistTrack } from '../../utils/playlistModel';
import type { PlaybackClock } from '../../utils/playbackClock';
import { TrackArt } from './TrackArt';

export type DropSide = 'before' | 'after';

interface TrackRowProps {
  track: PlaylistTrack;
  /** Position in the whole list (numbering, moves). */
  index: number;
  active: boolean;
  playing: boolean;
  /** Reordering allowed (off while the list is filtered). */
  reorderable: boolean;
  dropSide: DropSide | null;
  /** Playhead source for the active row's progress hairline (effective time). */
  clock: PlaybackClock;
  duration: number;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
  onKeyNav: (id: string, e: KeyboardEvent<HTMLButtonElement>) => void;
  onDragStart: (index: number, e: DragEvent<HTMLLIElement>) => void;
  onDragOver: (index: number, side: DropSide, e: DragEvent<HTMLLIElement>) => void;
  onDrop: (index: number, e: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}

/** The playing row's progress: written straight to the DOM from the clock. */
function ActiveProgress({ clock, duration }: { clock: PlaybackClock; duration: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const apply = () => {
      const ratio = duration > 0 ? Math.min(1, Math.max(0, clock.get() / duration)) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };
    apply();
    return clock.subscribe(apply);
  }, [clock, duration]);
  return <span ref={ref} className="track-progress" aria-hidden="true" />;
}

/** Three little bars that dance while the row is playing (still under reduced motion). */
function EqBars({ playing }: { playing: boolean }) {
  return (
    <span className={cn('eq-bars', playing && 'is-playing')} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/**
 * One playlist entry. The whole row plays the track; hovering reveals the play
 * glyph in place of the number and a remove button. Rows drag to reorder, and
 * the keyboard does everything the mouse can: arrows walk the list, Alt+arrows
 * move the track, Delete removes it.
 *
 * Memoised on its own props, so the playlist re-renders only the rows whose
 * state actually changed (the playhead never re-renders it at all).
 */
export const TrackRow = memo(function TrackRow({
  track,
  index,
  active,
  playing,
  reorderable,
  dropSide,
  clock,
  duration,
  onPlay,
  onRemove,
  onKeyNav,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TrackRowProps) {
  const { t } = useTranslation();
  const subtitle = [track.artist, track.format].filter(Boolean).join(' · ');

  return (
    <li
      data-track-id={track.id}
      className={cn('track-row group', active && 'is-active', dropSide && `drop-${dropSide}`, track.broken && 'is-broken')}
      draggable={reorderable}
      onDragStart={(e) => onDragStart(index, e)}
      onDragOver={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onDragOver(index, e.clientY < rect.top + rect.height / 2 ? 'before' : 'after', e);
      }}
      onDrop={(e) => onDrop(index, e)}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="track-main"
        onClick={() => onPlay(track.id)}
        onKeyDown={(e) => onKeyNav(track.id, e)}
        aria-current={active ? 'true' : undefined}
      >
        <span className="track-index" aria-hidden="true">
          {active ? (
            <EqBars playing={playing} />
          ) : (
            <>
              <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
              <Play className="track-play" fill="currentColor" strokeWidth={0} />
            </>
          )}
        </span>
        <TrackArt title={track.title} cover={track.cover} className="track-art" iconClassName="h-4 w-4" />
        <span className="min-w-0 flex-1">
          <span className="track-title">{track.title}</span>
          <span className="track-sub">
            {track.broken ? (
              <span className="inline-flex items-center gap-1 text-[rgb(var(--color-accent-text))]">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {t('playlist.broken')}
              </span>
            ) : (
              subtitle
            )}
          </span>
        </span>
        <span className="track-duration">{track.duration ? formatClock(track.duration) : <span aria-hidden="true">–:––</span>}</span>
      </button>
      <button
        type="button"
        className="track-remove"
        onClick={() => onRemove(track.id)}
        aria-label={t('playlist.remove')}
        tabIndex={-1}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {active && <ActiveProgress clock={clock} duration={duration} />}
    </li>
  );
});
