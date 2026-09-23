import { FILE_FORMATS } from '../constants';

/**
 * Pure playlist logic - no React, no storage - so the navigation rules (shuffle,
 * repeat, a removed-while-playing track) stay unit-testable in isolation.
 */

export type RepeatMode = 'off' | 'all' | 'one';

export const REPEAT_CYCLE: readonly RepeatMode[] = ['off', 'all', 'one'];

export function isRepeatMode(value: unknown): value is RepeatMode {
  return value === 'off' || value === 'all' || value === 'one';
}

export function nextRepeatMode(mode: RepeatMode): RepeatMode {
  return REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(mode) + 1) % REPEAT_CYCLE.length];
}

export interface PlaylistTrack {
  id: string;
  file: File;
  /** Display title: the tag title when the file carries one, else the filename sans extension. */
  title: string;
  artist: string | null;
  /** Upper-cased extension (MP3, FLAC...) - a readout, never part of the title. */
  format: string;
  size: number;
  addedAt: number;
  /** Seconds, or null until probed / decoded. */
  duration: number | null;
  /** Embedded artwork, when the file carries one. */
  cover: Blob | null;
  /** Set when the file failed to decode, so auto-advance steps over it. */
  broken?: boolean;
}

const KNOWN_EXTENSIONS: ReadonlySet<string> = new Set(
  Object.values(FILE_FORMATS.EXTENSIONS).flat(),
);

export function fileExtension(name: string): string {
  return name.match(/\.([^/.]+)$/)?.[1]?.toLowerCase() ?? '';
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

/**
 * Whether a file looks like audio we can try to decode. The MIME type alone is
 * unreliable (FLAC/AIFF often arrive typeless, WebM as video/webm), so the
 * extension is an equal witness. Anything else (cover.jpg in a dropped album
 * folder, a .cue sheet) is filtered out before it reaches the list.
 */
export function isAcceptedAudioFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('audio/')) return true;
  return KNOWN_EXTENSIONS.has(fileExtension(file.name));
}

/** Identity of a file across sessions, so dropping the same song twice doesn't duplicate it. */
export function fileKey(file: { name: string; size: number; lastModified: number }): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

/** Natural order ("2 - x" before "10 - x"), matching how a file browser lists an album. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function createTrackId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Where the navigation cursor sits. Normally the loaded track's index in the play
 * order; when that track was removed from the list while it kept playing, the
 * slot it vacated (`orphanIndex`) stands in, so "next" plays what followed it and
 * "previous" what preceded it.
 */
export interface Cursor {
  activeId: string | null;
  orphanIndex: number | null;
}

/**
 * The id `step` places away from the cursor in `order`, or null at an edge when
 * not wrapping. With no cursor at all, forward starts at the top and backward at
 * the bottom.
 */
export function neighborId(order: readonly string[], cursor: Cursor, step: 1 | -1, wrap: boolean): string | null {
  const n = order.length;
  if (n === 0) return null;
  const index = cursor.activeId ? order.indexOf(cursor.activeId) : -1;
  let target: number;
  if (index >= 0) target = index + step;
  else if (cursor.orphanIndex !== null) target = step === 1 ? cursor.orphanIndex : cursor.orphanIndex - 1;
  else target = step === 1 ? 0 : n - 1;

  if (target >= n) return wrap ? order[0] : null;
  if (target < 0) return wrap ? order[n - 1] : null;
  return order[target];
}

/**
 * The next id to auto-play after `cursor`, skipping tracks that failed to decode.
 * Walks at most one full lap so a list of broken files can't spin forever.
 */
export function nextPlayableId(
  order: readonly string[],
  cursor: Cursor,
  wrap: boolean,
  isBroken: (id: string) => boolean,
): string | null {
  let probe: Cursor = cursor;
  for (let i = 0; i < order.length; i += 1) {
    const id = neighborId(order, probe, 1, wrap);
    if (id === null) return null;
    if (!isBroken(id)) return id;
    if (id === cursor.activeId) return null;
    probe = { activeId: id, orphanIndex: null };
  }
  return null;
}

/** Fisher-Yates; `random` is injectable for deterministic tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A fresh shuffle lap. The track playing now leads it, so turning shuffle on
 * never jumps away from the song you're hearing - only what comes after changes.
 */
export function buildShuffleOrder(ids: readonly string[], leadId: string | null, random: () => number = Math.random): string[] {
  const rest = shuffled(ids.filter((id) => id !== leadId), random);
  return leadId && ids.includes(leadId) ? [leadId, ...rest] : rest;
}

/**
 * Next shuffle lap once the current one runs out (repeat all). Avoids replaying
 * the song that just ended back-to-back when the list has room to avoid it.
 */
export function nextShuffleLap(ids: readonly string[], justPlayed: string | null, random: () => number = Math.random): string[] {
  const lap = shuffled(ids, random);
  if (lap.length > 1 && lap[0] === justPlayed) {
    [lap[0], lap[1]] = [lap[1], lap[0]];
  }
  return lap;
}

/**
 * Fold newly added ids into a running shuffle lap: each lands at a random spot
 * AFTER the current track, so it's still ahead of you instead of in the past.
 */
export function insertIntoShuffle(
  order: readonly string[],
  newIds: readonly string[],
  cursor: Cursor,
  random: () => number = Math.random,
): string[] {
  const out = order.slice();
  const activeIndex = cursor.activeId ? out.indexOf(cursor.activeId) : -1;
  const floor = activeIndex >= 0 ? activeIndex + 1 : cursor.orphanIndex ?? 0;
  for (const id of newIds) {
    if (out.includes(id)) continue;
    const span = out.length - floor + 1;
    out.splice(floor + Math.floor(random() * span), 0, id);
  }
  return out;
}

/** Move one entry, returning a new array (indices clamp to the list). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items.slice();
  const out = items.slice();
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, item);
  return out;
}

export function totalDuration(tracks: readonly PlaylistTrack[]): number {
  return tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0);
}
