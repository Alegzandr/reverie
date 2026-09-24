import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlusIcon, HardDriveIcon, PlaylistIcon, PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react';
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PLAYLIST } from '../../constants';
import { formatClock } from '../../utils/formatters';
import { totalDuration, type PlaylistTrack } from '../../utils/playlistModel';
import type { PlaybackClock } from '../../utils/playbackClock';
import { collectPickedAudio } from '../../utils/fileCollect';
import { usePickerFullscreenRestore } from '../../hooks/usePickerFullscreenRestore';
import { ScrollFade } from '../ScrollFade';
import { TrackRow, type DropSide } from './TrackRow';

interface PlaylistPanelProps {
  tracks: PlaylistTrack[];
  activeId: string | null;
  isPlaying: boolean;
  /** Playhead (effective time) and duration, for the active row's progress line. */
  clock: PlaybackClock;
  duration: number;
  storageError: boolean;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
  onAddFiles: (files: File[]) => void;
}

const TRACK_DRAG_TYPE = 'application/x-reverie-track';

/** A hidden file input + the button that opens it (files, or a whole folder). */
function PickButton({
  folder,
  label,
  onFiles,
  className,
  children,
}: {
  folder?: boolean;
  label: string;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { onInputClick, restore } = usePickerFullscreenRestore();
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = collectPickedAudio(e.target.files);
    restore();
    if (files.length) onFiles(files);
    e.target.value = '';
  };
  // `webkitdirectory` isn't in React's input typings; it's universal in practice.
  const folderProps = folder ? ({ webkitdirectory: '', directory: '' } as Record<string, string>) : {};
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onClick={onInputClick}
        onChange={onChange}
        aria-label={label}
        {...folderProps}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={className} onClick={() => inputRef.current?.click()} aria-label={label}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </>
  );
}

/**
 * The playlist console: everything you've loaded, in order, remembered on this
 * device. Click a track to play it; drag rows (or Alt+arrows) to reorder;
 * Delete or the hover cross removes one; the bin empties the list after a
 * one-step confirm. A filter appears once the list is long enough to need it.
 */
export const PlaylistPanel = memo(function PlaylistPanel({
  tracks,
  activeId,
  isPlaying,
  clock,
  duration,
  storageError,
  onPlay,
  onRemove,
  onMove,
  onClear,
  onAddFiles,
}: PlaylistPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [drop, setDrop] = useState<{ index: number; side: DropSide } | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  const query = filter.trim().toLowerCase();
  const visible = useMemo(
    () =>
      tracks
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => !query || `${track.title} ${track.artist ?? ''}`.toLowerCase().includes(query)),
    [tracks, query],
  );
  const reorderable = !query;
  const total = totalDuration(tracks);

  // Row handlers read the list through refs: were they to close over `visible`
  // or `drop`, every scan patch / drag step would hand all rows a new callback
  // and defeat TrackRow's memo (O(rows) renders per change).
  const navRef = useRef({ visible, reorderable, count: tracks.length });
  const dropRef = useRef(drop);
  useEffect(() => {
    navRef.current = { visible, reorderable, count: tracks.length };
    dropRef.current = drop;
  }, [visible, reorderable, tracks.length, drop]);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-track-id="${id}"] .track-main`)?.focus();
    });
  }, []);

  const onKeyNav = useCallback(
    (id: string, e: KeyboardEvent<HTMLButtonElement>) => {
      const { visible, reorderable, count } = navRef.current;
      const pos = visible.findIndex((v) => v.track.id === id);
      if (pos < 0) return;
      const { index } = visible[pos];
      const key = e.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const step = key === 'ArrowUp' ? -1 : 1;
        if (e.altKey && reorderable) {
          const to = index + step;
          if (to >= 0 && to < count) {
            onMove(index, to);
            focusRow(id);
          }
        } else {
          focusRow(visible[pos + step]?.track.id);
        }
      } else if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onRemove(id);
        focusRow((visible[pos + 1] ?? visible[pos - 1])?.track.id);
      }
    },
    [onMove, onRemove, focusRow],
  );

  const onDragStart = useCallback((index: number, e: DragEvent<HTMLLIElement>) => {
    dragFromRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TRACK_DRAG_TYPE, String(index));
  }, []);

  const onDragOver = useCallback((index: number, side: DropSide, e: DragEvent<HTMLLIElement>) => {
    if (dragFromRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDrop((prev) => (prev && prev.index === index && prev.side === side ? prev : { index, side }));
  }, []);

  const onDrop = useCallback(
    (index: number, e: DragEvent<HTMLLIElement>) => {
      const from = dragFromRef.current;
      if (from === null) return;
      e.preventDefault();
      const drop = dropRef.current;
      const side = drop?.index === index ? drop.side : 'before';
      let to = side === 'after' ? index + 1 : index;
      if (from < to) to -= 1;
      if (to !== from) onMove(from, to);
      dragFromRef.current = null;
      setDrop(null);
    },
    [onMove],
  );

  const onDragEnd = useCallback(() => {
    dragFromRef.current = null;
    setDrop(null);
  }, []);

  const iconButton =
    'grid h-8 w-8 place-items-center rounded-full text-[rgb(var(--color-text-secondary))] transition-colors hover:bg-[rgba(var(--color-text),0.08)] hover:text-[rgb(var(--color-text))] outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 className="pane-title">{t('playlist.title')}</h2>
          {tracks.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-[rgb(var(--color-text-secondary))]">
              <PlaylistIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {tracks.length}
              {total > 0 && <span aria-hidden="true">·</span>}
              {total > 0 && formatClock(total)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <PickButton label={t('playlist.add')} onFiles={onAddFiles} className={iconButton}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
          </PickButton>
          <PickButton folder label={t('playlist.addFolder')} onFiles={onAddFiles} className={iconButton}>
            <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
          </PickButton>
          {tracks.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => setConfirmClear(true)}
                  aria-label={t('playlist.clear')}
                  aria-expanded={confirmClear}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('playlist.clear')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {confirmClear && tracks.length > 0 && (
        <div
          role="alertdialog"
          aria-label={t('playlist.clearConfirm', { count: tracks.length })}
          className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[rgba(var(--color-accent),0.4)] bg-[rgba(var(--color-accent),0.1)] px-3.5 py-2.5 motion-safe:animate-in motion-safe:fade-in-0"
        >
          <span className="text-sm font-medium text-[rgb(var(--color-text))]">{t('playlist.clearConfirm', { count: tracks.length })}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="rounded-full px-3 py-1 text-xs font-semibold text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"
              onClick={() => setConfirmClear(false)}
              autoFocus
            >
              {t('playlist.cancel')}
            </button>
            <button
              type="button"
              className="rounded-full bg-[rgb(var(--color-accent))] px-3 py-1 text-xs font-semibold text-[rgb(var(--dream-deep))]"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              {t('playlist.clearYes')}
            </button>
          </span>
        </div>
      )}

      {tracks.length >= PLAYLIST.FILTER_MIN_TRACKS && (
        <label className="mx-4 mb-2 flex items-center gap-2 rounded-full border border-[rgba(var(--color-border),0.5)] bg-[rgba(var(--color-surface),0.35)] px-3 py-1.5 focus-within:border-[rgba(var(--color-accent),0.6)]">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-text-secondary))]" aria-hidden="true" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('playlist.filter')}
            aria-label={t('playlist.filter')}
            className="min-w-0 flex-1 bg-transparent text-sm text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-secondary))] outline-none"
          />
        </label>
      )}

      {tracks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(var(--color-accent),0.12)] text-[rgb(var(--color-accent-text))]">
            <PlaylistIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-text))]">{t('playlist.empty')}</p>
            <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">{t('playlist.emptyHint')}</p>
          </div>
          <PickButton
            label={t('playlist.add')}
            onFiles={onAddFiles}
            className="rounded-full border border-[rgba(var(--color-accent),0.5)] bg-[rgba(var(--color-accent),0.12)] px-4 py-2 text-sm font-semibold text-[rgb(var(--color-accent-text))] hover:bg-[rgba(var(--color-accent),0.2)]"
          >
            {t('playlist.add')}
          </PickButton>
        </div>
      ) : (
        <ScrollFade className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          <ol ref={listRef} className="track-list" data-own-arrows="true" aria-label={t('playlist.title')}>
            {visible.map(({ track, index }) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                active={track.id === activeId}
                playing={isPlaying && track.id === activeId}
                reorderable={reorderable}
                dropSide={drop?.index === index ? drop.side : null}
                // Only the active row draws progress; the others get stable
                // placeholders so a speed change doesn't re-render the list.
                clock={track.id === activeId ? clock : null}
                duration={track.id === activeId ? duration : 0}
                onPlay={onPlay}
                onRemove={onRemove}
                onKeyNav={onKeyNav}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            ))}
          </ol>
          {visible.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[rgb(var(--color-text-secondary))]">{t('playlist.noMatch')}</p>
          )}
        </ScrollFade>
      )}

      <p
        className={cn(
          'flex items-start gap-1.5 border-t border-[rgba(var(--color-border),0.35)] px-5 py-3 text-[11px]',
          storageError ? 'text-[rgb(var(--color-accent-text))]' : 'text-[rgb(var(--color-text-secondary))]',
        )}
      >
        <HardDriveIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {/* Two lines rather than an ellipsis: the promise (or the storage
            warning) is the whole point of this line - it must be readable. */}
        <span className="line-clamp-2">{storageError ? t('playlist.storageFull') : t('playlist.stored')}</span>
      </p>
    </div>
  );
});
