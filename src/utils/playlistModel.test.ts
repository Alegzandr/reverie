import { describe, it, expect } from 'vitest';
import {
  buildShuffleOrder,
  fileKey,
  insertIntoShuffle,
  isAcceptedAudioFile,
  moveItem,
  neighborId,
  nextPlayableId,
  nextRepeatMode,
  nextShuffleLap,
  naturalCompare,
  stripExtension,
} from './playlistModel';

// Deterministic "random": walks a fixed sequence.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('playlistModel', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('steps through the play order and stops at the edges without wrap', () => {
    expect(neighborId(order, { activeId: 'b', orphanIndex: null }, 1, false)).toBe('c');
    expect(neighborId(order, { activeId: 'b', orphanIndex: null }, -1, false)).toBe('a');
    expect(neighborId(order, { activeId: 'd', orphanIndex: null }, 1, false)).toBeNull();
    expect(neighborId(order, { activeId: 'a', orphanIndex: null }, -1, false)).toBeNull();
  });

  it('wraps around both edges when asked', () => {
    expect(neighborId(order, { activeId: 'd', orphanIndex: null }, 1, true)).toBe('a');
    expect(neighborId(order, { activeId: 'a', orphanIndex: null }, -1, true)).toBe('d');
  });

  it('continues from the slot a removed-while-playing track left behind', () => {
    // 'b' was at index 1 and got removed: next is what slid into its slot.
    const after = ['a', 'c', 'd'];
    expect(neighborId(after, { activeId: 'b', orphanIndex: 1 }, 1, false)).toBe('c');
    expect(neighborId(after, { activeId: 'b', orphanIndex: 1 }, -1, false)).toBe('a');
  });

  it('starts at the top (or bottom) when nothing is active', () => {
    expect(neighborId(order, { activeId: null, orphanIndex: null }, 1, false)).toBe('a');
    expect(neighborId(order, { activeId: null, orphanIndex: null }, -1, false)).toBe('d');
    expect(neighborId([], { activeId: null, orphanIndex: null }, 1, true)).toBeNull();
  });

  it('skips broken tracks on auto-advance and never spins on an all-broken list', () => {
    const broken = new Set(['b', 'c']);
    expect(nextPlayableId(order, { activeId: 'a', orphanIndex: null }, false, (id) => broken.has(id))).toBe('d');
    expect(nextPlayableId(order, { activeId: 'a', orphanIndex: null }, true, () => true)).toBeNull();
  });

  it('cycles repeat modes off → all → one → off', () => {
    expect(nextRepeatMode('off')).toBe('all');
    expect(nextRepeatMode('all')).toBe('one');
    expect(nextRepeatMode('one')).toBe('off');
  });

  it('leads a shuffle lap with the playing track', () => {
    const lap = buildShuffleOrder(order, 'c', seq(0.1, 0.9, 0.5));
    expect(lap[0]).toBe('c');
    expect([...lap].sort()).toEqual(order);
  });

  it('never replays the track that just ended at the start of a new lap', () => {
    const lap = nextShuffleLap(['a', 'b'], 'a', seq(0.99));
    expect(lap[0]).toBe('b');
  });

  it('inserts added tracks after the current one in a running shuffle', () => {
    const out = insertIntoShuffle(['a', 'b', 'c'], ['x', 'y'], { activeId: 'b', orphanIndex: null }, seq(0));
    expect(out.indexOf('x')).toBeGreaterThan(out.indexOf('b'));
    expect(out.indexOf('y')).toBeGreaterThan(out.indexOf('b'));
    expect(out).toHaveLength(5);
  });

  it('moves items immutably', () => {
    const src = ['a', 'b', 'c'];
    expect(moveItem(src, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(src, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(src).toEqual(['a', 'b', 'c']);
  });

  it('accepts audio by MIME or by extension, rejects the rest', () => {
    expect(isAcceptedAudioFile(new File([''], 'x.mp3', { type: 'audio/mpeg' }))).toBe(true);
    expect(isAcceptedAudioFile(new File([''], 'x.flac', { type: '' }))).toBe(true);
    expect(isAcceptedAudioFile(new File([''], 'x.webm', { type: 'video/webm' }))).toBe(true);
    expect(isAcceptedAudioFile(new File([''], 'cover.jpg', { type: 'image/jpeg' }))).toBe(false);
    expect(isAcceptedAudioFile(new File([''], 'album.cue', { type: '' }))).toBe(false);
  });

  it('identifies a file by name, size and date, and sorts names naturally', () => {
    const f = new File(['abc'], 'a.mp3', { lastModified: 5 });
    expect(fileKey(f)).toBe(fileKey(new File(['xyz'], 'a.mp3', { lastModified: 5 })));
    expect(['10 - b', '2 - a', '1 - c'].sort(naturalCompare)).toEqual(['1 - c', '2 - a', '10 - b']);
    expect(stripExtension('My Song.final.mp3')).toBe('My Song.final');
  });
});
