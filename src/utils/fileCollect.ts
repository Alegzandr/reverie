import { isAcceptedAudioFile, naturalCompare } from './playlistModel';

/**
 * Turn a drop (files, whole folders, or a mix) into the audio files it carries,
 * in the order a file browser would list them - so dropping an album folder
 * queues "01 - ..." through "12 - ..." without the cover.jpg or the .cue sheet.
 */

/** Minimal shape of the (webkit-prefixed, but universal) File System entry API. */
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
  file?: (ok: (file: File) => void, fail?: (err: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (entries: FsEntry[]) => void, fail?: (err: unknown) => void) => void };
}

/** A folder deeper than this is almost certainly a mis-drop (a whole drive); stop there. */
const MAX_DEPTH = 8;

function entryFile(entry: FsEntry): Promise<File | null> {
  return new Promise((resolve) => {
    if (!entry.file) return resolve(null);
    entry.file(resolve, () => resolve(null));
  });
}

async function readAllEntries(entry: FsEntry): Promise<FsEntry[]> {
  const reader = entry.createReader?.();
  if (!reader) return [];
  const all: FsEntry[] = [];
  // readEntries pages its results (100 at a time in Chromium) - loop until empty.
  for (;;) {
    const batch = await new Promise<FsEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function walk(entry: FsEntry, depth: number, out: { path: string; file: File }[]): Promise<void> {
  if (entry.isFile) {
    const file = await entryFile(entry);
    if (file) out.push({ path: entry.fullPath || file.name, file });
    return;
  }
  if (entry.isDirectory && depth < MAX_DEPTH) {
    for (const child of await readAllEntries(entry)) await walk(child, depth + 1, out);
  }
}

export function sortAndFilterAudio(items: { path: string; file: File }[]): File[] {
  return items
    .filter(({ file }) => isAcceptedAudioFile(file))
    .sort((a, b) => naturalCompare(a.path, b.path))
    .map(({ file }) => file);
}

/** Every accepted audio file in a DataTransfer, folders expanded, naturally sorted. */
export async function collectDroppedAudio(data: DataTransfer | null): Promise<File[]> {
  if (!data) return [];
  const items = Array.from(data.items ?? []);
  const entries = items
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? (item.webkitGetAsEntry() as FsEntry | null) : null));

  // No entry API (or the browser handed back none): fall back to the flat list.
  if (!entries.some(Boolean)) {
    return sortAndFilterAudio(Array.from(data.files ?? []).map((file) => ({ path: file.name, file })));
  }

  const collected: { path: string; file: File }[] = [];
  for (const entry of entries) if (entry) await walk(entry, 0, collected);
  return sortAndFilterAudio(collected);
}

/** Same filtering/sorting for a file-picker selection (webkitRelativePath keeps folder order). */
export function collectPickedAudio(list: FileList | File[] | null): File[] {
  const files = Array.from(list ?? []);
  return sortAndFilterAudio(
    files.map((file) => ({ path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, file })),
  );
}
