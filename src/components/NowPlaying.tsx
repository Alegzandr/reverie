import { memo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { PLAYLIST } from '../constants';
import type { PlaylistTrack } from '../utils/playlistModel';
import type { PlaybackClock } from '../utils/playbackClock';
import { TrackArt } from './playlist/TrackArt';
import { MarqueeText } from './MarqueeText';

interface NowPlayingProps {
  title: string;
  artist: string | null;
  cover: Blob | null;
  /** Format telemetry (FLAC · 44.1 kHz · 24-bit ...), secondary by design. */
  details: string[];
  /** 1-based position in the playlist, when the track is in it. */
  position: number | null;
  total: number;
  upNext: PlaylistTrack | null;
  clock: PlaybackClock;
  duration: number;
}

/**
 * The track, set like a title card over the world: artwork, the name in the
 * display serif at poster size, the artist and the format telemetry beneath,
 * and - in the last seconds - what comes next.
 */
export const NowPlaying = memo(function NowPlaying({
  title,
  artist,
  cover,
  details,
  position,
  total,
  upNext,
  clock,
  duration,
}: NowPlayingProps) {
  const { t } = useTranslation();
  // Only flips twice per track (in/out of the lead window), so it re-renders twice.
  const nearEnd = useSyncExternalStore(clock.subscribe, () =>
    duration > 0 && duration - clock.get() <= PLAYLIST.UP_NEXT_LEAD_SECONDS,
  );

  return (
    <div className="now-playing">
      <TrackArt title={title} cover={cover} className="now-playing-art" iconClassName="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <p className="now-playing-kicker">
          {t('playlist.nowPlaying')}
          {position !== null && total > 0 && (
            <span className="tabular-nums"> · {t('playlist.position', { index: position, total })}</span>
          )}
        </p>
        <h1 className="min-w-0">
          <MarqueeText text={title} className="now-playing-title" />
        </h1>
        <p className="now-playing-meta">
          {artist && <span className="font-semibold text-[rgb(var(--color-text))]">{artist}</span>}
          {details.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </p>
        {upNext && nearEnd && (
          <p className="now-playing-next motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
            {t('playlist.upNext')} · <span className="text-[rgb(var(--color-text))]">{upNext.title}</span>
          </p>
        )}
      </div>
    </div>
  );
});
