import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYLIST } from '../constants';
import type { PlaylistApi } from './usePlaylist';
import type { RepeatMode } from '../utils/playlistModel';
import type { PlaybackClock } from '../utils/playbackClock';

/** The slice of useAudioProcessor the playlist drives. */
export interface PlayerAudio {
  isPlaying: boolean;
  repeat: RepeatMode;
  hasSession: boolean;
  playbackClock: PlaybackClock;
  duration: number;
  loadAudioFile: (file: File) => Promise<AudioBuffer | undefined>;
  playAudio: (buffer?: AudioBuffer, startTime?: number) => void;
  seekTo: (time: number, bufferOverride?: AudioBuffer | null) => void;
}

/** Consecutive undecodable files auto-advance will step over before giving up. */
const MAX_BROKEN_SKIPS = 8;

interface PlayOptions {
  autoplay: boolean;
  /** Source-time seconds to start from (resume). */
  startAt?: number;
}

/**
 * Glue between the playlist (what should play) and the audio engine (playing it):
 * loading a track by id, next/previous with the repeat rules, advancing when a
 * song ends, resuming the last session at boot, and checkpointing the playhead.
 *
 * Every load carries a sequence number, so rapid skips resolve to the LAST one
 * the listener asked for - an older decode finishing late is simply dropped.
 */
export function usePlaylistPlayer(playlist: PlaylistApi, audio: PlayerAudio) {
  // The playlist object is rebuilt every render, but its functions are stable -
  // depend on those, or every callback below would churn each render.
  const {
    getTrack,
    setActive,
    markBroken,
    setDuration,
    neighbor,
    nextForAutoAdvance,
    addFiles: addToList,
    checkpoint,
    restored,
    resumeSession,
  } = playlist;
  const seqRef = useRef(0);
  // True from a track's activation until its decode settles: the playback clock
  // still reads the PREVIOUS track's position then, and a checkpoint would file
  // it under the new id (setActive already recorded 0 for it).
  const loadPendingRef = useRef(false);
  const audioRef = useRef(audio);
  useEffect(() => {
    audioRef.current = audio;
  });

  const playTrack = useCallback(
    async (id: string, { autoplay, startAt = 0 }: PlayOptions): Promise<boolean> => {
      const track = getTrack(id);
      if (!track) return false;
      const seq = ++seqRef.current;
      loadPendingRef.current = true;
      setActive(id);
      let buffer: AudioBuffer | undefined;
      try {
        buffer = await audioRef.current.loadAudioFile(track.file);
      } finally {
        // A superseded load leaves the flag to the newer one still in flight.
        if (seq === seqRef.current) loadPendingRef.current = false;
      }
      if (seq !== seqRef.current) return false;
      if (!buffer) {
        markBroken(id, true);
        return false;
      }
      if (track.broken) markBroken(id, false);
      setDuration(id, buffer.duration);
      // Resume a little before a finished song's very end would replay nothing -
      // start it over instead.
      const resumable = startAt > 0 && startAt < buffer.duration - PLAYLIST.RESUME_TAIL_GUARD_SECONDS;
      const from = resumable ? startAt : 0;
      if (from > 0) audioRef.current.seekTo(from, buffer);
      if (autoplay) audioRef.current.playAudio(buffer, from);
      return true;
    },
    [getTrack, setActive, markBroken, setDuration],
  );

  const next = useCallback(() => {
    const id = neighbor(1, audioRef.current.repeat !== 'off');
    if (id) void playTrack(id, { autoplay: audioRef.current.isPlaying });
  }, [neighbor, playTrack]);

  /** Classic "previous": restart the song unless you're right at its start. */
  const previous = useCallback(() => {
    const a = audioRef.current;
    if (a.playbackClock.get() > PLAYLIST.PREVIOUS_RESTART_THRESHOLD_SECONDS) {
      a.seekTo(0);
      return;
    }
    const id = neighbor(-1, a.repeat !== 'off');
    if (id) void playTrack(id, { autoplay: a.isPlaying });
    else a.seekTo(0);
  }, [neighbor, playTrack]);

  /** Natural end of a song: step to the next playable one (wrapping under repeat all). */
  const handleTrackEnd = useCallback(() => {
    const wrap = audioRef.current.repeat === 'all';
    const skipped = new Set<string>();
    const advance = (from: string | undefined) => {
      const id = nextForAutoAdvance(wrap, { from, skip: skipped });
      if (!id) return;
      void playTrack(id, { autoplay: true }).then((ok) => {
        // An undecodable file: step past it (bounded, so a run of dead files
        // can't loop forever) - unless a newer skip already took over.
        if (!ok && getTrack(id) && skipped.size < MAX_BROKEN_SKIPS && seqRef.current === seqAtStart + skipped.size + 1) {
          skipped.add(id);
          advance(id);
        }
      });
    };
    const seqAtStart = seqRef.current;
    advance(undefined);
  }, [nextForAutoAdvance, playTrack, getTrack]);

  /**
   * Add files to the list. `play` starts the first of them now; otherwise they
   * queue quietly - unless nothing is loaded yet, in which case the first one is
   * loaded (paused) so the workspace has something to show.
   */
  const addFiles = useCallback(
    (files: File[], mode: 'append' | 'play' = 'append') => {
      if (!files.length) return;
      void addToList(files).then((ids) => {
        if (!ids.length) return;
        if (mode === 'play') void playTrack(ids[0], { autoplay: true });
        else if (!audioRef.current.hasSession) void playTrack(ids[0], { autoplay: false });
      });
    },
    [addToList, playTrack],
  );

  // ── Boot: land back in the last session ─────────────────────────────────────
  const [bootSettled, setBootSettled] = useState(false);
  const bootStartedRef = useRef(false);
  useEffect(() => {
    if (!restored || bootStartedRef.current) return;
    bootStartedRef.current = true;
    if (!resumeSession || audioRef.current.hasSession) return;
    void playTrack(resumeSession.activeId, { autoplay: false, startAt: resumeSession.position }).finally(() =>
      setBootSettled(true),
    );
  }, [restored, resumeSession, playTrack]);

  /**
   * Drop whatever load is in flight (reset to the welcome stage): its decode
   * resolving later must not pull the session back in.
   */
  const cancelPending = useCallback(() => {
    seqRef.current += 1;
    loadPendingRef.current = false;
  }, []);

  // ── Checkpoint the playhead while listening, on pause, and on the way out ──
  const savePosition = useCallback(() => {
    if (loadPendingRef.current) return;
    checkpoint(audioRef.current.playbackClock.get());
  }, [checkpoint]);

  useEffect(() => {
    if (!audio.isPlaying) {
      savePosition();
      return;
    }
    const id = window.setInterval(savePosition, PLAYLIST.POSITION_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [audio.isPlaying, savePosition]);

  useEffect(() => {
    window.addEventListener('pagehide', savePosition);
    return () => window.removeEventListener('pagehide', savePosition);
  }, [savePosition]);

  return {
    playTrack,
    next,
    previous,
    handleTrackEnd,
    addFiles,
    cancelPending,
    /** True until the stored playlist is read and the last track (if any) is loaded. */
    booting: !restored || (resumeSession !== null && !bootSettled && !audio.hasSession),
  };
}
