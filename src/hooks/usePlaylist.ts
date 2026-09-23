import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PLAYLIST } from '../constants';
import {
  buildShuffleOrder,
  createTrackId,
  fileExtension,
  fileKey,
  insertIntoShuffle,
  moveItem,
  neighborId,
  nextPlayableId,
  nextShuffleLap,
  stripExtension,
  type Cursor,
  type PlaylistTrack,
} from '../utils/playlistModel';
import {
  clearStoredPlaylist,
  isPlaylistStorageAvailable,
  isQuotaError,
  loadStoredPlaylist,
  patchTrack,
  removeTracks,
  requestPersistentStorage,
  saveOrder,
  saveTracks,
  type StoredTrackRecord,
} from '../utils/playlistStore';
import { readAudioTags } from '../utils/audioTags';
import { probeDuration } from '../utils/audioProbe';
import { readStoredBool, writeStored } from '../utils/storage';
import { releaseCoverUrl } from '../utils/coverUrl';

interface PlaylistState {
  tracks: PlaylistTrack[];
  activeId: string | null;
  /** Play-order slot the active track vacated when it was removed mid-listen. */
  orphanIndex: number | null;
  shuffle: boolean;
  shuffleOrder: string[];
  restored: boolean;
}

type Action =
  | { type: 'restore'; tracks: PlaylistTrack[]; shuffleOrder: string[] }
  | { type: 'add'; tracks: PlaylistTrack[]; random: () => number }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'move'; from: number; to: number }
  | { type: 'setActive'; id: string | null }
  | { type: 'patch'; id: string; patch: Partial<PlaylistTrack> }
  | { type: 'setShuffle'; on: boolean; order: string[] }
  | { type: 'setShuffleOrder'; order: string[] };

const playOrderOf = (s: PlaylistState) => (s.shuffle ? s.shuffleOrder : s.tracks.map((t) => t.id));

export function playlistReducer(state: PlaylistState, action: Action): PlaylistState {
  switch (action.type) {
    case 'restore':
      return {
        ...state,
        tracks: action.tracks,
        shuffleOrder: state.shuffle ? action.shuffleOrder : [],
        restored: true,
      };
    case 'add': {
      const known = new Set(state.tracks.map((t) => fileKey(t.file)));
      const fresh = action.tracks.filter((t) => {
        const key = fileKey(t.file);
        if (known.has(key)) return false;
        known.add(key);
        return true;
      });
      if (!fresh.length) return state;
      const cursor: Cursor = { activeId: state.activeId, orphanIndex: state.orphanIndex };
      return {
        ...state,
        tracks: [...state.tracks, ...fresh],
        shuffleOrder: state.shuffle
          ? insertIntoShuffle(state.shuffleOrder, fresh.map((t) => t.id), cursor, action.random)
          : state.shuffleOrder,
      };
    }
    case 'remove': {
      const order = playOrderOf(state);
      const removedAt = order.indexOf(action.id);
      if (removedAt < 0) return state;
      let orphanIndex = state.orphanIndex;
      if (action.id === state.activeId) orphanIndex = removedAt;
      else if (orphanIndex !== null && removedAt < orphanIndex) orphanIndex -= 1;
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.id),
        shuffleOrder: state.shuffleOrder.filter((id) => id !== action.id),
        orphanIndex,
      };
    }
    case 'clear':
      return { ...state, tracks: [], shuffleOrder: [], orphanIndex: null };
    case 'move':
      return { ...state, tracks: moveItem(state.tracks, action.from, action.to) };
    case 'setActive':
      return { ...state, activeId: action.id, orphanIndex: null };
    case 'patch':
      return {
        ...state,
        tracks: state.tracks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'setShuffle':
      return { ...state, shuffle: action.on, shuffleOrder: action.on ? action.order : [] };
    case 'setShuffleOrder':
      return { ...state, shuffleOrder: action.order };
    default:
      return state;
  }
}

export interface ResumeSession {
  activeId: string;
  /** Source-time seconds into the track. */
  position: number;
}

function readSession(): { activeId: string | null; position: number } {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PLAYLIST.SESSION_STORAGE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const { activeId, position } = raw as { activeId?: unknown; position?: unknown };
      return {
        activeId: typeof activeId === 'string' ? activeId : null,
        position: typeof position === 'number' && Number.isFinite(position) ? Math.max(0, position) : 0,
      };
    }
  } catch {
    // Corrupt entry - start fresh.
  }
  return { activeId: null, position: 0 };
}

function writeSession(activeId: string | null, position: number) {
  try {
    if (activeId) localStorage.setItem(PLAYLIST.SESSION_STORAGE_KEY, JSON.stringify({ activeId, position }));
    else localStorage.removeItem(PLAYLIST.SESSION_STORAGE_KEY);
  } catch {
    // Storage full/disabled - the session just won't resume.
  }
}

function toRecord(t: PlaylistTrack, scanned: boolean): StoredTrackRecord {
  return {
    id: t.id,
    blob: t.file,
    fileName: t.file.name,
    type: t.file.type,
    lastModified: t.file.lastModified,
    size: t.size,
    addedAt: t.addedAt,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    cover: t.cover,
    scanned,
  };
}

function fromRecord(r: StoredTrackRecord): PlaylistTrack {
  const file = new File([r.blob], r.fileName, { type: r.type, lastModified: r.lastModified });
  return {
    id: r.id,
    file,
    title: r.title || stripExtension(r.fileName),
    artist: r.artist ?? null,
    format: fileExtension(r.fileName).toUpperCase(),
    size: r.size,
    addedAt: r.addedAt,
    duration: r.duration ?? null,
    cover: r.cover ?? null,
  };
}

export function trackFromFile(file: File, addedAt: number = Date.now()): PlaylistTrack {
  return {
    id: createTrackId(),
    file,
    title: stripExtension(file.name),
    artist: null,
    format: fileExtension(file.name).toUpperCase(),
    size: file.size,
    addedAt,
    duration: null,
    cover: null,
  };
}

/**
 * The listener's playlist: what's in it, what's playing, what comes next - and
 * its memory. Files persist on-device (IndexedDB) and the playing track + its
 * position are checkpointed, so a reload lands right back in the session.
 *
 * Persistence is declarative: an effect diffs the committed track list against
 * what's already stored and writes only the delta (add / remove / reorder), in
 * a serialized queue so writes never race. Tags + durations are filled in by a
 * background scan, one file at a time, so a big drop never stalls the UI.
 */
export function usePlaylist() {
  const [state, dispatch] = useReducer(playlistReducer, undefined, () => ({
    tracks: [],
    activeId: null,
    orphanIndex: null,
    shuffle: readStoredBool(PLAYLIST.SHUFFLE_STORAGE_KEY),
    shuffleOrder: [],
    // Nothing to read without storage: the (session-only) list is ready at once.
    restored: !isPlaylistStorageAvailable(),
  }));
  const [storageError, setStorageError] = useState(false);
  const [resumeSession, setResumeSession] = useState<ResumeSession | null>(null);

  // Latest committed state for event-time reads (next/prev/add), so the action
  // callbacks can stay identity-stable instead of re-creating on every change.
  const stateRef = useRef(state);
  // Tracks added but not yet committed: an add followed at once by a play (drop
  // → play now) must find its track before React has re-rendered.
  const pendingRef = useRef(new Map<string, PlaylistTrack>());
  useEffect(() => {
    stateRef.current = state;
    for (const t of state.tracks) pendingRef.current.delete(t.id);
  }, [state]);

  // ── Boot: restore the stored list ──────────────────────────────────────────
  const persistedRef = useRef<{ ids: Set<string>; order: string }>({ ids: new Set(), order: '' });
  const scanQueueRef = useRef<string[]>([]);
  const scanningRef = useRef(false);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueWrite = useCallback((op: () => Promise<void>) => {
    writeChainRef.current = writeChainRef.current
      .then(op)
      .catch((error: unknown) => {
        if (isQuotaError(error)) setStorageError(true);
        else console.warn('Playlist storage failed:', error);
      });
  }, []);

  // Background metadata scan: tags (title/artist/cover) then a header-only
  // duration probe, strictly one file at a time.
  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    try {
      while (scanQueueRef.current.length) {
        const id = scanQueueRef.current.shift()!;
        const track = stateRef.current.tracks.find((t) => t.id === id) ?? pendingRef.current.get(id);
        if (!track) continue;
        const tags = await readAudioTags(track.file);
        const duration = track.duration ?? (await probeDuration(track.file));
        const patch: Partial<PlaylistTrack> = {
          title: tags.title ?? track.title,
          artist: tags.artist ?? track.artist,
          cover: tags.cover ?? track.cover,
          duration: track.duration ?? duration,
        };
        dispatch({ type: 'patch', id, patch });
        enqueueWrite(() =>
          patchTrack(id, {
            title: patch.title,
            artist: patch.artist ?? null,
            cover: patch.cover ?? null,
            duration: patch.duration ?? null,
            scanned: true,
          }),
        );
      }
    } finally {
      scanningRef.current = false;
    }
  }, [enqueueWrite]);

  const queueScan = useCallback(
    (ids: string[]) => {
      scanQueueRef.current.push(...ids);
      void runScan();
    },
    [runScan],
  );

  useEffect(() => {
    if (!isPlaylistStorageAvailable()) return;
    let cancelled = false;
    loadStoredPlaylist()
      .then((stored) => {
        if (cancelled) return;
        const records = stored?.records ?? [];
        const byId = new Map(records.map((r) => [r.id, r]));
        const ordered = (stored?.order ?? []).map((id) => byId.get(id)).filter((r): r is StoredTrackRecord => !!r);
        const stragglers = records.filter((r) => !ordered.includes(r)).sort((a, b) => a.addedAt - b.addedAt);
        const all = [...ordered, ...stragglers];
        const tracks = all.map(fromRecord);
        persistedRef.current = { ids: new Set(tracks.map((t) => t.id)), order: tracks.map((t) => t.id).join('|') };
        dispatch({ type: 'restore', tracks, shuffleOrder: buildShuffleOrder(tracks.map((t) => t.id), null) });

        const session = readSession();
        const resumeId = tracks.some((t) => t.id === session.activeId) ? session.activeId : tracks[0]?.id ?? null;
        setResumeSession(
          resumeId ? { activeId: resumeId, position: resumeId === session.activeId ? session.position : 0 } : null,
        );
        const unscanned = all.filter((r) => !r.scanned).map((r) => r.id);
        if (unscanned.length) queueScan(unscanned);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('Playlist restore failed:', error);
        dispatch({ type: 'restore', tracks: [], shuffleOrder: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [queueScan]);

  // ── Declarative persistence: write the delta of every committed change ────
  useEffect(() => {
    if (!state.restored) return;
    const persisted = persistedRef.current;
    const ids = state.tracks.map((t) => t.id);
    const order = ids.join('|');
    if (order === persisted.order && ids.length === persisted.ids.size) return;

    const current = new Set(ids);
    const added = state.tracks.filter((t) => !persisted.ids.has(t.id));
    const removed = [...persisted.ids].filter((id) => !current.has(id));
    persistedRef.current = { ids: current, order };

    if (!ids.length && removed.length) {
      enqueueWrite(clearStoredPlaylist);
      return;
    }
    if (added.length) {
      requestPersistentStorage();
      const records = added.map((t) => toRecord(t, false));
      enqueueWrite(() => saveTracks(records, ids));
    }
    if (removed.length) enqueueWrite(() => removeTracks(removed, ids));
    if (!added.length && !removed.length) enqueueWrite(() => saveOrder(ids));
  }, [state.restored, state.tracks, enqueueWrite]);

  useEffect(() => {
    writeStored(PLAYLIST.SHUFFLE_STORAGE_KEY, state.shuffle);
  }, [state.shuffle]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Add files to the end of the list. Returns one id per input file, in input
   * order - the existing id when that exact file is already in the list, so a
   * re-dropped song is found rather than duplicated.
   */
  const addFiles = useCallback(
    (files: File[]): string[] => {
      const byKey = new Map(stateRef.current.tracks.map((t) => [fileKey(t.file), t.id]));
      const now = Date.now();
      const fresh: PlaylistTrack[] = [];
      const ids = files.map((file, i) => {
        const key = fileKey(file);
        const existing = byKey.get(key);
        if (existing) return existing;
        const track = trackFromFile(file, now + i);
        byKey.set(key, track.id);
        fresh.push(track);
        return track.id;
      });
      if (fresh.length) {
        for (const t of fresh) pendingRef.current.set(t.id, t);
        dispatch({ type: 'add', tracks: fresh, random: Math.random });
        queueScan(fresh.map((t) => t.id));
      }
      return ids;
    },
    [queueScan],
  );

  const removeTrack = useCallback((id: string) => {
    const track = stateRef.current.tracks.find((t) => t.id === id);
    if (track?.cover) releaseCoverUrl(track.cover);
    scanQueueRef.current = scanQueueRef.current.filter((q) => q !== id);
    dispatch({ type: 'remove', id });
  }, []);

  const clear = useCallback(() => {
    for (const t of stateRef.current.tracks) if (t.cover) releaseCoverUrl(t.cover);
    scanQueueRef.current = [];
    dispatch({ type: 'clear' });
  }, []);

  const moveTrack = useCallback((from: number, to: number) => {
    dispatch({ type: 'move', from, to });
  }, []);

  const setActive = useCallback((id: string | null) => {
    dispatch({ type: 'setActive', id });
    writeSession(id, 0);
  }, []);

  const markBroken = useCallback((id: string, broken: boolean) => {
    dispatch({ type: 'patch', id, patch: { broken } });
  }, []);

  /** The decoder knows the exact length - it overrides the header probe. */
  const setDuration = useCallback(
    (id: string, seconds: number) => {
      const track = stateRef.current.tracks.find((t) => t.id === id);
      if (!track || !Number.isFinite(seconds) || seconds <= 0) return;
      if (track.duration !== null && Math.abs(track.duration - seconds) < 0.05) return;
      dispatch({ type: 'patch', id, patch: { duration: seconds } });
      enqueueWrite(() => patchTrack(id, { duration: seconds }));
    },
    [enqueueWrite],
  );

  const toggleShuffle = useCallback(() => {
    const s = stateRef.current;
    const on = !s.shuffle;
    const ids = s.tracks.map((t) => t.id);
    dispatch({ type: 'setShuffle', on, order: on ? buildShuffleOrder(ids, s.activeId) : [] });
  }, []);

  /**
   * The id `step` away from the playing track in play order (shuffle lap or
   * list), or null at an edge without wrap. Wrapping forward past a finished
   * shuffle lap deals a fresh lap instead of replaying the same sequence.
   */
  const neighbor = useCallback((step: 1 | -1, wrap: boolean): string | null => {
    const s = stateRef.current;
    const order = playOrderOf(s);
    const cursor: Cursor = { activeId: s.activeId, orphanIndex: s.orphanIndex };
    const inLap = neighborId(order, cursor, step, false);
    if (inLap !== null || !wrap) return inLap;
    if (s.shuffle && step === 1 && order.length > 1) {
      const lap = nextShuffleLap(s.tracks.map((t) => t.id), s.activeId);
      dispatch({ type: 'setShuffleOrder', order: lap });
      return lap[0];
    }
    return neighborId(order, cursor, step, true);
  }, []);

  /**
   * What should play when a track ends on its own, skipping broken files. `from`
   * overrides the cursor and `skip` adds ids known dead in this same run (a
   * failed decode whose broken flag hasn't committed yet).
   */
  const nextForAutoAdvance = useCallback(
    (wrap: boolean, opts: { from?: string; skip?: ReadonlySet<string> } = {}): string | null => {
      const s = stateRef.current;
      const order = playOrderOf(s);
      const isBroken = (x: string) => !!opts.skip?.has(x) || !!s.tracks.find((t) => t.id === x)?.broken;
      const cursor: Cursor = opts.from
        ? { activeId: opts.from, orphanIndex: order.includes(opts.from) ? null : s.orphanIndex }
        : { activeId: s.activeId, orphanIndex: s.orphanIndex };
      const inLap = nextPlayableId(order, cursor, false, isBroken);
      if (inLap !== null || !wrap) return inLap;
      if (s.shuffle && order.length > 1) {
        const lap = nextShuffleLap(s.tracks.map((t) => t.id), cursor.activeId);
        const first = lap.find((x) => !isBroken(x));
        if (first) {
          dispatch({ type: 'setShuffleOrder', order: lap });
          return first;
        }
        return null;
      }
      return nextPlayableId(order, cursor, true, isBroken);
    },
    [],
  );

  const getTrack = useCallback(
    (id: string | null) =>
      stateRef.current.tracks.find((t) => t.id === id) ?? (id ? pendingRef.current.get(id) : undefined),
    [],
  );

  /** Persist the playhead so a reload resumes here. */
  const checkpoint = useCallback((position: number) => {
    const id = stateRef.current.activeId;
    if (id) writeSession(id, position);
  }, []);

  const activeIndex = useMemo(
    () => state.tracks.findIndex((t) => t.id === state.activeId),
    [state.tracks, state.activeId],
  );

  // Render-safe look-ahead (no shuffle-lap side effects): drives the transport's
  // enabled states and the "up next" line.
  const { upcomingId, previousId } = useMemo(() => {
    const order = state.shuffle ? state.shuffleOrder : state.tracks.map((t) => t.id);
    const cursor: Cursor = { activeId: state.activeId, orphanIndex: state.orphanIndex };
    return {
      upcomingId: neighborId(order, cursor, 1, false),
      previousId: neighborId(order, cursor, -1, false),
    };
  }, [state.shuffle, state.shuffleOrder, state.tracks, state.activeId, state.orphanIndex]);

  return {
    tracks: state.tracks,
    activeId: state.activeId,
    activeIndex,
    upcomingId,
    previousId,
    shuffle: state.shuffle,
    restored: state.restored,
    storageError,
    resumeSession,
    addFiles,
    removeTrack,
    clear,
    moveTrack,
    setActive,
    markBroken,
    setDuration,
    toggleShuffle,
    neighbor,
    nextForAutoAdvance,
    getTrack,
    checkpoint,
  };
}

export type PlaylistApi = ReturnType<typeof usePlaylist>;
