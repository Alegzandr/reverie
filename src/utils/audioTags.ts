/**
 * Minimal, dependency-free reader for the tags a playlist actually shows: title,
 * artist and embedded cover art. Covers ID3v2.2-2.4 (MP3, and ID3-tagged
 * WAV/AIFF heads), FLAC/Ogg Vorbis comments + pictures, and MP4/M4A `ilst`
 * atoms. Reads only the byte ranges it needs through Blob.slice, so a 200 MB
 * file costs a few KB of I/O. Every parser is defensive: malformed input yields
 * empty tags, never an exception.
 */

export interface AudioTags {
  title: string | null;
  artist: string | null;
  cover: Blob | null;
}

const EMPTY: AudioTags = { title: null, artist: null, cover: null };

/** Tag blocks bigger than this are not worth reading (runaway sizes = corruption). */
const MAX_TAG_BYTES = 16 * 1024 * 1024;
/** How deep into an Ogg stream the comment packet may start. */
const OGG_SCAN_BYTES = 2 * 1024 * 1024;
/** Top-level MP4 atoms walked before giving up on finding `moov`. */
const MP4_MAX_TOP_ATOMS = 64;

async function readBytes(blob: Blob, start: number, end: number): Promise<Uint8Array> {
  const slice = blob.slice(Math.max(0, start), Math.min(blob.size, end));
  // Blob.arrayBuffer is missing in older engines (and jsdom); FileReader is the net.
  if (typeof slice.arrayBuffer === 'function') return new Uint8Array(await slice.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(slice);
  });
}

const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.subarray(start, start + len));

function decodeText(bytes: Uint8Array, encoding: 'latin1' | 'utf-8' | 'utf-16le' | 'utf-16be' | 'utf-16'): string {
  let enc: string = encoding;
  let data = bytes;
  if (encoding === 'utf-16') {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      enc = 'utf-16le';
      data = bytes.subarray(2);
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      enc = 'utf-16be';
      data = bytes.subarray(2);
    } else {
      enc = 'utf-16le';
    }
  }
  try {
    return new TextDecoder(enc === 'latin1' ? 'iso-8859-1' : enc).decode(data);
  } catch {
    return '';
  }
}

const clean = (s: string | null | undefined): string | null => {
  const v = (s ?? '').replace(/\0/g, '').trim();
  return v.length ? v : null;
};

const MIME_BY_ALIAS: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

/** Trust the bytes over the declared type: taggers write "image/jpg", "JPG", "" ... */
function imageBlob(bytes: Uint8Array, declared: string): Blob | null {
  if (bytes.length < 16) return null;
  let type = '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) type = 'image/jpeg';
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) type = 'image/png';
  else if (ascii(bytes, 0, 4) === 'GIF8') type = 'image/gif';
  else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') type = 'image/webp';
  else {
    const d = declared.toLowerCase().trim();
    type = d.includes('/') ? d : MIME_BY_ALIAS[d] ?? '';
  }
  if (!type.startsWith('image/')) return null;
  // Copy out of the (possibly large) read buffer so it can be released.
  return new Blob([bytes.slice()], { type });
}

// ── ID3v2 ────────────────────────────────────────────────────────────────────

const syncsafe = (b: Uint8Array, o: number) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
const be32 = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const le32 = (b: Uint8Array, o: number) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + ((b[o + 3] << 24) >>> 0);

function unsynchronise(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let j = 0;
  for (let i = 0; i < b.length; i += 1) {
    out[j++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i += 1;
  }
  return out.subarray(0, j);
}

const ID3_ENCODINGS = ['latin1', 'utf-16', 'utf-16be', 'utf-8'] as const;

/** Index just past a string terminator for the frame's text encoding. */
function skipTerminated(b: Uint8Array, start: number, encodingByte: number): number {
  const wide = encodingByte === 1 || encodingByte === 2;
  for (let i = start; i < b.length; i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return i + (wide ? 2 : 1);
  }
  return b.length;
}

function readId3Text(frame: Uint8Array): string | null {
  if (frame.length < 2) return null;
  const enc = ID3_ENCODINGS[frame[0]] ?? 'latin1';
  // v2.4 multi-value frames separate values with NULs - the first value is the one to show.
  return clean(decodeText(frame.subarray(1), enc).split('\0')[0]);
}

function readId3Picture(frame: Uint8Array, v22: boolean): Blob | null {
  if (frame.length < 8) return null;
  const encodingByte = frame[0];
  let offset = 1;
  let mime: string;
  if (v22) {
    mime = ascii(frame, 1, 3);
    offset = 4;
  } else {
    const end = frame.indexOf(0, 1);
    if (end < 0) return null;
    mime = ascii(frame, 1, end - 1);
    offset = end + 1;
  }
  offset += 1; // picture type
  offset = skipTerminated(frame, offset, encodingByte);
  return imageBlob(frame.subarray(offset), mime);
}

async function parseId3(blob: Blob, head: Uint8Array): Promise<AudioTags> {
  const major = head[3];
  if (major < 2 || major > 4) return EMPTY;
  const flags = head[5];
  const size = syncsafe(head, 6);
  if (size <= 0 || size > MAX_TAG_BYTES) return EMPTY;
  let tag = await readBytes(blob, 10, 10 + size);
  if (flags & 0x80 && major < 4) tag = unsynchronise(tag);

  let offset = 0;
  if (flags & 0x40 && major >= 3) {
    const extSize = major === 4 ? syncsafe(tag, 0) : be32(tag, 0) + 4;
    offset = extSize;
  }

  const v22 = major === 2;
  const idLen = v22 ? 3 : 4;
  const headerLen = v22 ? 6 : 10;
  const ids = v22
    ? { title: 'TT2', artist: 'TP1', band: 'TP2', picture: 'PIC' }
    : { title: 'TIT2', artist: 'TPE1', band: 'TPE2', picture: 'APIC' };

  let title: string | null = null;
  let artist: string | null = null;
  let band: string | null = null;
  let cover: Blob | null = null;

  while (offset + headerLen <= tag.length) {
    const id = ascii(tag, offset, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding reached
    const frameSize = v22
      ? (tag[offset + 3] << 16) | (tag[offset + 4] << 8) | tag[offset + 5]
      : major === 4
        ? syncsafe(tag, offset + 4)
        : be32(tag, offset + 4);
    const start = offset + headerLen;
    const end = start + frameSize;
    if (frameSize <= 0 || end > tag.length) break;
    let frame = tag.subarray(start, end);
    // v2.4 per-frame unsynchronisation flag.
    if (major === 4 && tag[offset + 9] & 0x02) frame = unsynchronise(frame);

    if (id === ids.title && !title) title = readId3Text(frame);
    else if (id === ids.artist && !artist) artist = readId3Text(frame);
    else if (id === ids.band && !band) band = readId3Text(frame);
    else if (id === ids.picture && !cover) cover = readId3Picture(frame, v22);
    offset = end;
  }
  return { title, artist: artist ?? band, cover };
}

// ── Vorbis comments (FLAC + Ogg) ─────────────────────────────────────────────

interface CommentAcc {
  title: string | null;
  artist: string | null;
  cover: Blob | null;
}

function readVorbisComments(b: Uint8Array, start: number, acc: CommentAcc): void {
  let o = start;
  if (o + 4 > b.length) return;
  const vendorLen = le32(b, o);
  o += 4 + vendorLen;
  if (o + 4 > b.length) return;
  const count = le32(b, o);
  o += 4;
  for (let i = 0; i < count && o + 4 <= b.length; i += 1) {
    const len = le32(b, o);
    o += 4;
    if (o + len > b.length) return;
    const entry = decodeText(b.subarray(o, o + len), 'utf-8');
    o += len;
    const eq = entry.indexOf('=');
    if (eq < 0) continue;
    const key = entry.slice(0, eq).toUpperCase();
    const value = entry.slice(eq + 1);
    if (key === 'TITLE' && !acc.title) acc.title = clean(value);
    else if (key === 'ARTIST' && !acc.artist) acc.artist = clean(value);
    else if (key === 'ALBUMARTIST' && !acc.artist) acc.artist = clean(value);
    else if (key === 'METADATA_BLOCK_PICTURE' && !acc.cover) {
      try {
        const raw = Uint8Array.from(atob(value.trim()), (c) => c.charCodeAt(0));
        acc.cover = readFlacPicture(raw);
      } catch {
        // Bad base64 - skip the picture, keep the text.
      }
    }
  }
}

function readFlacPicture(b: Uint8Array): Blob | null {
  let o = 4; // picture type
  if (o + 4 > b.length) return null;
  const mimeLen = be32(b, o);
  o += 4;
  const mime = ascii(b, o, mimeLen);
  o += mimeLen;
  if (o + 4 > b.length) return null;
  const descLen = be32(b, o);
  o += 4 + descLen + 16; // description + width/height/depth/colours
  if (o + 4 > b.length) return null;
  const dataLen = be32(b, o);
  o += 4;
  return imageBlob(b.subarray(o, o + dataLen), mime);
}

async function parseFlac(blob: Blob): Promise<AudioTags> {
  const acc: CommentAcc = { title: null, artist: null, cover: null };
  let offset = 4;
  for (let guard = 0; guard < 128 && offset + 4 <= blob.size; guard += 1) {
    const header = await readBytes(blob, offset, offset + 4);
    if (header.length < 4) break;
    const last = (header[0] & 0x80) !== 0;
    const type = header[0] & 0x7f;
    const length = (header[1] << 16) | (header[2] << 8) | header[3];
    const start = offset + 4;
    if (length > MAX_TAG_BYTES) break;
    if (type === 4) readVorbisComments(await readBytes(blob, start, start + length), 0, acc);
    else if (type === 6 && !acc.cover) acc.cover = readFlacPicture(await readBytes(blob, start, start + length));
    offset = start + length;
    if (last) break;
  }
  return acc;
}

async function parseOgg(blob: Blob): Promise<AudioTags> {
  const b = await readBytes(blob, 0, OGG_SCAN_BYTES);
  // Reassemble the first logical stream's packets from its pages; the comment
  // header is packet #2 (Vorbis "\x03vorbis", Opus "OpusTags").
  const packets: Uint8Array[] = [];
  let current: number[] = [];
  let o = 0;
  let serial: number | null = null;
  while (o + 27 <= b.length && packets.length < 2) {
    if (ascii(b, o, 4) !== 'OggS') break;
    const pageSerial = le32(b, o + 14);
    const segments = b[o + 26];
    const table = o + 27;
    let body = table + segments;
    if (serial === null) serial = pageSerial;
    for (let s = 0; s < segments; s += 1) {
      const lace = b[table + s];
      if (pageSerial === serial) {
        for (let i = 0; i < lace && body + i < b.length; i += 1) current.push(b[body + i]);
        if (lace < 255) {
          packets.push(Uint8Array.from(current));
          current = [];
        }
      }
      body += lace;
    }
    o = body;
  }
  const comment = packets[1];
  if (!comment) return EMPTY;
  const acc: CommentAcc = { title: null, artist: null, cover: null };
  if (ascii(comment, 1, 6) === 'vorbis') readVorbisComments(comment, 7, acc);
  else if (ascii(comment, 0, 8) === 'OpusTags') readVorbisComments(comment, 8, acc);
  return acc;
}

// ── MP4 / M4A ────────────────────────────────────────────────────────────────

interface Atom {
  type: string;
  start: number; // payload start
  end: number;
}

function* childAtoms(b: Uint8Array, start: number, end: number): Generator<Atom> {
  let o = start;
  while (o + 8 <= end) {
    let size = be32(b, o);
    const type = ascii(b, o + 4, 4);
    let header = 8;
    if (size === 1) {
      size = be32(b, o + 12) + be32(b, o + 8) * 2 ** 32;
      header = 16;
    } else if (size === 0) size = end - o;
    if (size < header || o + size > end) return;
    yield { type, start: o + header, end: o + size };
    o += size;
  }
}

async function parseMp4(blob: Blob): Promise<AudioTags> {
  // Walk the top level without reading mdat: moov may sit before or after it.
  let offset = 0;
  let moov: Uint8Array | null = null;
  for (let i = 0; i < MP4_MAX_TOP_ATOMS && offset + 8 <= blob.size; i += 1) {
    const h = await readBytes(blob, offset, offset + 16);
    let size = be32(h, 0);
    const type = ascii(h, 4, 4);
    if (size === 1) size = be32(h, 12) + be32(h, 8) * 2 ** 32;
    else if (size === 0) size = blob.size - offset;
    if (size < 8) break;
    if (type === 'moov') {
      if (size > MAX_TAG_BYTES * 4) break;
      moov = await readBytes(blob, offset, offset + size);
      break;
    }
    offset += size;
  }
  if (!moov) return EMPTY;

  const find = (start: number, end: number, type: string) => {
    for (const a of childAtoms(moov!, start, end)) if (a.type === type) return a;
    return null;
  };
  const top = find(0, moov.length, 'moov');
  const udta = top && find(top.start, top.end, 'udta');
  const meta = udta && find(udta.start, udta.end, 'meta');
  // `meta` is a full atom: 4 bytes of version/flags precede its children.
  const ilst = meta && find(meta.start + 4, meta.end, 'ilst');
  if (!ilst) return EMPTY;

  const out: AudioTags = { title: null, artist: null, cover: null };
  for (const item of childAtoms(moov, ilst.start, ilst.end)) {
    const data = find(item.start, item.end, 'data');
    if (!data || data.end - data.start < 8) continue;
    const kind = be32(moov, data.start) & 0xffffff;
    const payload = moov.subarray(data.start + 8, data.end);
    if (item.type === '©nam') out.title = clean(decodeText(payload, 'utf-8'));
    else if (item.type === '©ART' && !out.artist) out.artist = clean(decodeText(payload, 'utf-8'));
    else if (item.type === 'aART' && !out.artist) out.artist = clean(decodeText(payload, 'utf-8'));
    else if (item.type === 'covr' && !out.cover) out.cover = imageBlob(payload, kind === 14 ? 'image/png' : 'image/jpeg');
  }
  return out;
}

/** Read title / artist / cover from a file's embedded tags. Never throws. */
export async function readAudioTags(blob: Blob): Promise<AudioTags> {
  try {
    if (blob.size < 12) return EMPTY;
    const head = await readBytes(blob, 0, 12);
    const magic = ascii(head, 0, 4);
    if (ascii(head, 0, 3) === 'ID3') return await parseId3(blob, head);
    if (magic === 'fLaC') return await parseFlac(blob);
    if (magic === 'OggS') return await parseOgg(blob);
    if (ascii(head, 4, 4) === 'ftyp') return await parseMp4(blob);
    return EMPTY;
  } catch {
    return EMPTY;
  }
}
