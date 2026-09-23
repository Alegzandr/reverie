import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearStoredPlaylist,
  loadStoredPlaylist,
  patchTrack,
  removeTracks,
  resetPlaylistStoreForTests,
  saveOrder,
  saveTracks,
  type StoredTrackRecord,
} from './playlistStore';

const record = (id: string): StoredTrackRecord => ({
  id,
  blob: new Blob([id]),
  fileName: `${id}.mp3`,
  type: 'audio/mpeg',
  lastModified: 1,
  size: 1,
  addedAt: 1,
  title: id,
  artist: null,
  duration: null,
  cover: null,
  scanned: false,
});

describe('playlistStore', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetPlaylistStoreForTests();
  });

  it('round-trips tracks and their order', async () => {
    await saveTracks([record('a'), record('b')], ['b', 'a']);
    const stored = await loadStoredPlaylist();
    expect(stored?.order).toEqual(['b', 'a']);
    expect(stored?.records.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('removes, reorders, patches and clears', async () => {
    await saveTracks([record('a'), record('b'), record('c')], ['a', 'b', 'c']);
    await removeTracks(['b'], ['a', 'c']);
    await saveOrder(['c', 'a']);
    await patchTrack('a', { duration: 42, scanned: true });

    let stored = await loadStoredPlaylist();
    expect(stored?.order).toEqual(['c', 'a']);
    expect(stored?.records.find((r) => r.id === 'a')).toMatchObject({ duration: 42, scanned: true });
    expect(stored?.records.some((r) => r.id === 'b')).toBe(false);

    await clearStoredPlaylist();
    stored = await loadStoredPlaylist();
    expect(stored).toEqual({ records: [], order: [] });
  });
});
