import { PLAYLIST } from '../constants';

/**
 * On-device persistence for the playlist: the audio files themselves live in
 * IndexedDB (Blobs are stored by reference on disk, not inflated into memory),
 * next to the list order. Nothing ever leaves the device - this is the same
 * privacy promise as the rest of Reverie, just with a memory.
 *
 * Every entry point degrades to a no-op when IndexedDB is unavailable (private
 * modes that disable it, old engines, tests without a shim): the playlist still
 * works for the session, it just won't be there after a reload.
 */

export interface StoredTrackRecord {
  id: string;
  blob: Blob;
  /** Original filename (with extension) - rebuilt into a File on restore. */
  fileName: string;
  type: string;
  lastModified: number;
  size: number;
  addedAt: number;
  title: string;
  artist: string | null;
  duration: number | null;
  cover: Blob | null;
  /** Tags + duration probe done - a restore re-queues records that never finished. */
  scanned: boolean;
}

export interface StoredPlaylist {
  records: StoredTrackRecord[];
  order: string[];
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

export function isPlaylistStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isPlaylistStorageAvailable()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(PLAYLIST.DB_NAME, PLAYLIST.DB_VERSION);
      } catch {
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PLAYLIST.TRACKS_STORE)) {
          db.createObjectStore(PLAYLIST.TRACKS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PLAYLIST.META_STORE)) {
          db.createObjectStore(PLAYLIST.META_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab upgrading the schema must not be blocked by us holding it open.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      // A failed open (storage disabled, corrupt profile) is not an app error -
      // the playlist simply runs session-only.
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }
  return dbPromise;
}

/** Test hook: forget the cached connection (e.g. after swapping the IDB shim). */
export function resetPlaylistStoreForTests(): void {
  dbPromise = null;
}

export async function loadStoredPlaylist(): Promise<StoredPlaylist | null> {
  const db = await openDb();
  if (!db) return null;
  const tx = db.transaction([PLAYLIST.TRACKS_STORE, PLAYLIST.META_STORE], 'readonly');
  const [records, order] = await Promise.all([
    requestToPromise(tx.objectStore(PLAYLIST.TRACKS_STORE).getAll() as IDBRequest<StoredTrackRecord[]>),
    requestToPromise(tx.objectStore(PLAYLIST.META_STORE).get(PLAYLIST.ORDER_KEY) as IDBRequest<unknown>),
  ]);
  return {
    records: records ?? [],
    order: Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [],
  };
}

/** Add (or overwrite) records and write the order in one atomic transaction. */
export async function saveTracks(records: StoredTrackRecord[], order: string[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([PLAYLIST.TRACKS_STORE, PLAYLIST.META_STORE], 'readwrite');
  const tracks = tx.objectStore(PLAYLIST.TRACKS_STORE);
  for (const record of records) tracks.put(record);
  tx.objectStore(PLAYLIST.META_STORE).put(order, PLAYLIST.ORDER_KEY);
  await transactionDone(tx);
}

export async function removeTracks(ids: string[], order: string[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([PLAYLIST.TRACKS_STORE, PLAYLIST.META_STORE], 'readwrite');
  const tracks = tx.objectStore(PLAYLIST.TRACKS_STORE);
  for (const id of ids) tracks.delete(id);
  tx.objectStore(PLAYLIST.META_STORE).put(order, PLAYLIST.ORDER_KEY);
  await transactionDone(tx);
}

export async function saveOrder(order: string[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(PLAYLIST.META_STORE, 'readwrite');
  tx.objectStore(PLAYLIST.META_STORE).put(order, PLAYLIST.ORDER_KEY);
  await transactionDone(tx);
}

/** Merge late-arriving facts (probed duration, parsed tags) into a stored record. */
export async function patchTrack(id: string, patch: Partial<Omit<StoredTrackRecord, 'id' | 'blob'>>): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(PLAYLIST.TRACKS_STORE, 'readwrite');
  const store = tx.objectStore(PLAYLIST.TRACKS_STORE);
  // Chained in the success callback (not an await) so the put is queued while the
  // transaction is guaranteed active, whatever the engine's microtask semantics.
  const read = store.get(id);
  read.onsuccess = () => {
    const current = read.result as StoredTrackRecord | undefined;
    if (current) store.put({ ...current, ...patch });
  };
  await transactionDone(tx);
}

export async function clearStoredPlaylist(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([PLAYLIST.TRACKS_STORE, PLAYLIST.META_STORE], 'readwrite');
  tx.objectStore(PLAYLIST.TRACKS_STORE).clear();
  tx.objectStore(PLAYLIST.META_STORE).delete(PLAYLIST.ORDER_KEY);
  await transactionDone(tx);
}

/**
 * Ask the browser not to evict the stored tracks under storage pressure. Best
 * effort and silent: some browsers grant it, some prompt, some ignore it.
 */
export function requestPersistentStorage(): void {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (storage && typeof storage.persist === 'function') {
      void storage.persisted?.().then((already) => (already ? true : storage.persist())).catch(() => {});
    }
  } catch {
    // Not supported - nothing to do.
  }
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
}
