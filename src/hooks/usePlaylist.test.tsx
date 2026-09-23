import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlaylist } from './usePlaylist';
import { loadStoredPlaylist, resetPlaylistStoreForTests } from '../utils/playlistStore';

vi.mock('../utils/audioProbe', () => ({ probeDuration: vi.fn(async () => 42) }));

const file = (name: string, lastModified = 1) => new File([name], `${name}.mp3`, { type: 'audio/mpeg', lastModified });

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
    act(() => {
      ids = result.current.addFiles([file('a'), file('b')]);
    });
    expect(result.current.tracks.map((t) => t.title)).toEqual(['a', 'b']);

    let again: string[] = [];
    act(() => {
      again = result.current.addFiles([file('a')]);
    });
    expect(again).toEqual([ids[0]]);
    expect(result.current.tracks).toHaveLength(2);

    await waitFor(() => expect(result.current.tracks.every((t) => t.duration === 42)).toBe(true));
  });

  it('persists the list and restores it, order and session included, on a fresh mount', async () => {
    const first = await renderRestored();
    let ids: string[] = [];
    act(() => {
      ids = first.result.current.addFiles([file('a'), file('b'), file('c')]);
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
    act(() => {
      ids = result.current.addFiles([file('a'), file('b'), file('c')]);
    });
    act(() => result.current.setActive(ids[2]));
    expect(result.current.neighbor(1, false)).toBeNull();
    expect(result.current.neighbor(1, true)).toBe(ids[0]);

    act(() => result.current.setActive(ids[1]));
    act(() => result.current.removeTrack(ids[1]));
    // 'b' is gone but still playing: next is what followed it, previous what preceded it.
    expect(result.current.neighbor(1, false)).toBe(ids[2]);
    expect(result.current.neighbor(-1, false)).toBe(ids[0]);
  });

  it('skips broken files when advancing on its own', async () => {
    const { result } = await renderRestored();
    let ids: string[] = [];
    act(() => {
      ids = result.current.addFiles([file('a'), file('b'), file('c')]);
    });
    act(() => result.current.setActive(ids[0]));
    act(() => result.current.markBroken(ids[1], true));
    expect(result.current.nextForAutoAdvance(false)).toBe(ids[2]);
  });

  it('clears everything, stored copies included', async () => {
    const { result } = await renderRestored();
    act(() => {
      result.current.addFiles([file('a'), file('b')]);
    });
    await waitFor(async () => expect((await loadStoredPlaylist())?.records).toHaveLength(2));
    act(() => result.current.clear());
    expect(result.current.tracks).toHaveLength(0);
    await waitFor(async () => expect((await loadStoredPlaylist())?.records).toHaveLength(0));
  });
});
