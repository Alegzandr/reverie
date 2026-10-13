import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { playlistReducer, trackFromFile, usePlaylist } from './usePlaylist';
import { probeDuration } from '../utils/audioProbe';
import { PLAYLIST } from '../constants';
import { loadStoredPlaylist, resetPlaylistStoreForTests } from '../utils/playlistStore';

vi.mock('../utils/audioProbe', () => ({ probeDuration: vi.fn(async () => 42) }));

const file = (name: string, lastModified = 1) => new File([name], `${name}.mp3`, { type: 'audio/mpeg', lastModified });

// Let background scans + writes land before the next test swaps the database.
async function settled(count: number) {
  await waitFor(async () => {
    const records = (await loadStoredPlaylist())?.records ?? [];
    expect(records.length === count && records.every((r) => r.scanned)).toBe(true);
  });
}

async function renderRestored() {
  const hook = renderHook(() => usePlaylist());
  await waitFor(() => expect(hook.result.current.restored).toBe(true));
  return hook;
}

describe('usePlaylist', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetPlaylistStoreForTests();
  });

  it('adds files in order, dedupes a re-added file, and fills durations in the background', async () => {
    const { result } = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([file('a'), file('b')]);
    });
    expect(result.current.tracks.map((t) => t.title)).toEqual(['a', 'b']);

    let again: string[] = [];
    await act(async () => {
      again = await result.current.addFiles([file('a')]);
    });
    expect(again).toEqual([ids[0]]);
    expect(result.current.tracks).toHaveLength(2);

    await waitFor(() => expect(result.current.tracks.every((t) => t.duration === 42)).toBe(true));
  });

  it('dedupes byte-identical files even under another name or date, but keeps same-size different songs', async () => {
    const { result } = await renderRestored();
    const song = (name: string, body: string, lastModified = 1) =>
      new File([body], `${name}.mp3`, { type: 'audio/mpeg', lastModified });
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([song('a', 'same'), song('a (copy)', 'same', 9), song('b', 'diff')]);
    });
    expect(ids[1]).toBe(ids[0]);
    expect(result.current.tracks.map((t) => t.title)).toEqual(['a', 'b']);

    let again: string[] = [];
    await act(async () => {
      again = await result.current.addFiles([song('renamed', 'diff', 5), song('c', 'news')]);
    });
    expect(again[0]).toBe(ids[2]);
    expect(result.current.tracks.map((t) => t.title)).toEqual(['a', 'b', 'c']);
    await settled(3);
  });

  it('commits a batch with no size collision synchronously', async () => {
    const { result } = await renderRestored();
    act(() => {
      void result.current.addFiles([file('a'), file('bb')]);
    });
    expect(result.current.tracks).toHaveLength(2);
    await settled(2);
  });

  it('persists the list and restores it, order and session included, on a fresh mount', async () => {
    const first = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await first.result.current.addFiles([file('a'), file('b'), file('c')]);
    });
    act(() => first.result.current.moveTrack(2, 0));
    act(() => first.result.current.setActive(ids[1]));
    act(() => first.result.current.checkpoint(12.5));
    await waitFor(async () => expect((await loadStoredPlaylist())?.order).toEqual([ids[2], ids[0], ids[1]]));
    first.unmount();

    const second = await renderRestored();
    expect(second.result.current.tracks.map((t) => t.title)).toEqual(['c', 'a', 'b']);
    expect(second.result.current.resumeSession).toEqual({ activeId: ids[1], position: 12.5 });
  });

  it('navigates, wraps only when asked, and keeps the cursor when the playing track is removed', async () => {
    const { result } = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([file('a'), file('b'), file('c')]);
    });
    act(() => result.current.setActive(ids[2]));
    expect(result.current.neighbor(1, false)).toBeNull();
    expect(result.current.neighbor(1, true)).toBe(ids[0]);

    act(() => result.current.setActive(ids[1]));
    act(() => result.current.removeTrack(ids[1]));
    // 'b' is gone but still playing: next is what followed it, previous what preceded it.
    expect(result.current.neighbor(1, false)).toBe(ids[2]);
    expect(result.current.neighbor(-1, false)).toBe(ids[0]);
    await settled(2);
  });

  it('skips broken files when advancing on its own', async () => {
    const { result } = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([file('a'), file('b'), file('c')]);
    });
    act(() => result.current.setActive(ids[0]));
    act(() => result.current.markBroken(ids[1], true));
    expect(result.current.nextForAutoAdvance(false)).toBe(ids[2]);
    await settled(3);
  });

  it('clears everything, stored copies included', async () => {
    const { result } = await renderRestored();
    await act(async () => {
      await result.current.addFiles([file('a'), file('b')]);
    });
    await waitFor(async () => expect((await loadStoredPlaylist())?.records).toHaveLength(2));
    act(() => result.current.clear());
    expect(result.current.tracks).toHaveLength(0);
    await waitFor(async () => expect((await loadStoredPlaylist())?.records).toHaveLength(0));
  });

  it('lets a decoded duration that lands mid-scan win over the header probe', async () => {
    let resolveProbe: (value: number) => void = () => {};
    vi.mocked(probeDuration).mockImplementationOnce(() => new Promise((resolve) => (resolveProbe = resolve)));
    const { result } = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([file('a')]);
    });
    await waitFor(() => expect(probeDuration).toHaveBeenCalled());
    act(() => result.current.setDuration(ids[0], 123.4));
    await act(async () => resolveProbe(42));
    await settled(1);
    expect(result.current.tracks[0].duration).toBe(123.4);
    expect((await loadStoredPlaylist())?.records[0].duration).toBe(123.4);
  });

  it('under shuffle, the resumed track leads the restored lap so nothing before it is skipped', async () => {
    localStorage.setItem(PLAYLIST.SHUFFLE_STORAGE_KEY, 'true');
    const first = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await first.result.current.addFiles([file('a'), file('b'), file('c'), file('d')]);
    });
    act(() => first.result.current.setActive(ids[2]));
    await settled(4);
    first.unmount();

    // A dealer that would put the resumed track last without the lead.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const second = await renderRestored();
    vi.mocked(Math.random).mockRestore();
    expect(second.result.current.resumeSession?.activeId).toBe(ids[2]);
    act(() => second.result.current.setActive(ids[2]));
    expect(second.result.current.previousId).toBeNull();
    const heard = [ids[2]];
    for (let i = 0; i < 3; i += 1) {
      const nextId = second.result.current.neighbor(1, false);
      expect(nextId).not.toBeNull();
      act(() => second.result.current.setActive(nextId));
      heard.push(nextId!);
    }
    expect([...heard].sort()).toEqual([...ids].sort());
  });

  it('keeps the resume target on the most recently active track, falling back once it is removed', async () => {
    const { result } = await renderRestored();
    let ids: string[] = [];
    await act(async () => {
      ids = await result.current.addFiles([file('a'), file('b')]);
    });
    act(() => result.current.setActive(ids[1]));
    act(() => result.current.setActive(null));
    expect(result.current.resumeId).toBe(ids[1]);
    act(() => result.current.removeTrack(ids[1]));
    expect(result.current.resumeId).toBe(ids[0]);
    await settled(1);
  });
});

describe('playlistReducer', () => {
  const tracks = ['a', 'b', 'c', 'd'].map((n) => ({ ...trackFromFile(file(n)), id: n }));
  const base = {
    tracks,
    activeId: null,
    orphanIndex: null,
    orphanListIndex: null,
    lastActiveId: null,
    shuffle: false,
    shuffleOrder: [],
    restored: true,
  };

  it('a track started from nowhere under shuffle leads the lap', () => {
    const s = playlistReducer({ ...base, shuffle: true, shuffleOrder: ['b', 'd', 'a', 'c'] }, { type: 'setActive', id: 'a' });
    expect(s.shuffleOrder).toEqual(['a', 'b', 'd', 'c']);
  });

  it('a track picked mid-listen under shuffle keeps the lap as dealt', () => {
    const s = playlistReducer(
      { ...base, shuffle: true, shuffleOrder: ['b', 'd', 'a', 'c'], activeId: 'b' },
      { type: 'setActive', id: 'a' },
    );
    expect(s.shuffleOrder).toEqual(['b', 'd', 'a', 'c']);
  });

  it('re-measures the vacated slot when shuffle toggles', () => {
    // Shuffle lap d c b a, playing c (list slot 2), then c is removed.
    let s = playlistReducer({ ...base, shuffle: true, shuffleOrder: ['d', 'c', 'b', 'a'], activeId: 'c' }, { type: 'remove', id: 'c' });
    expect(s.orphanIndex).toBe(1);
    expect(s.orphanListIndex).toBe(2);
    s = playlistReducer(s, { type: 'setShuffle', on: false, order: [] });
    // List a b d: what followed c in the list is d.
    expect(s.orphanIndex).toBe(2);
    s = playlistReducer(s, { type: 'setShuffle', on: true, order: ['b', 'd', 'a'] });
    // A fresh lap lies wholly ahead.
    expect(s.orphanIndex).toBe(0);
  });

  it('moves the vacated slot with list reorders', () => {
    // List a b c d, playing b, removed: slot 1 (before c).
    let s = playlistReducer({ ...base, activeId: 'b' }, { type: 'remove', id: 'b' });
    expect(s.orphanIndex).toBe(1);
    // d to the top: d a | c
    s = playlistReducer(s, { type: 'move', from: 2, to: 0 });
    expect(s.tracks.map((t) => t.id)).toEqual(['d', 'a', 'c']);
    expect(s.orphanIndex).toBe(2);
    // a (before the slot) to the end: d | c a
    s = playlistReducer(s, { type: 'move', from: 1, to: 2 });
    expect(s.tracks.map((t) => t.id)).toEqual(['d', 'c', 'a']);
    expect(s.orphanIndex).toBe(1);
    expect(s.orphanListIndex).toBe(1);
  });
});
