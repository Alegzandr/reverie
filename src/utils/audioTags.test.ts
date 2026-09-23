import { describe, it, expect } from 'vitest';
import { readAudioTags } from './audioTags';

const enc = new TextEncoder();

function syncsafe(n: number): number[] {
  return [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];
}

function be32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function le32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

// A fake-but-valid PNG head (magic + filler) - the sniffer only needs the magic.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(24).fill(1)];

function id3v23Frame(id: string, payload: number[]): number[] {
  return [...enc.encode(id), ...be32(payload.length), 0, 0, ...payload];
}

function id3Tag(frames: number[]): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([...enc.encode('ID3'), 3, 0, 0, ...syncsafe(frames.length), ...frames, 0, 0, 0, 0]);
}

describe('readAudioTags', () => {
  it('reads ID3v2.3 title, artist and cover', async () => {
    const title = id3v23Frame('TIT2', [3, ...enc.encode('Midnight City')]);
    // UTF-16 with BOM for the artist - the common Windows tagger output.
    const utf16 = [0xff, 0xfe, ...Array.from('M83').flatMap((c) => [c.charCodeAt(0), 0])];
    const artist = id3v23Frame('TPE1', [1, ...utf16]);
    const apic = id3v23Frame('APIC', [0, ...enc.encode('image/png'), 0, 3, 0, ...PNG]);
    const tags = await readAudioTags(new Blob([id3Tag([...title, ...artist, ...apic]), new Uint8Array(64)]));
    expect(tags.title).toBe('Midnight City');
    expect(tags.artist).toBe('M83');
    expect(tags.cover?.type).toBe('image/png');
  });

  it('reads FLAC Vorbis comments', async () => {
    const vendor = enc.encode('ref');
    const comments = ['TITLE=Holocene', 'ARTIST=Bon Iver'].map((c) => enc.encode(c));
    const body = [
      ...le32(vendor.length),
      ...vendor,
      ...le32(comments.length),
      ...comments.flatMap((c) => [...le32(c.length), ...c]),
    ];
    // STREAMINFO (34 bytes) then a last VORBIS_COMMENT block.
    const bytes = Uint8Array.from([
      ...enc.encode('fLaC'),
      0x00, 0, 0, 34, ...new Array(34).fill(0),
      0x84, (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff, ...body,
    ]);
    const tags = await readAudioTags(new Blob([bytes]));
    expect(tags).toMatchObject({ title: 'Holocene', artist: 'Bon Iver', cover: null });
  });

  it('returns empty tags for untagged or garbage input', async () => {
    expect(await readAudioTags(new Blob([new Uint8Array(200)]))).toEqual({ title: null, artist: null, cover: null });
    const truncated = Uint8Array.from([...enc.encode('ID3'), 3, 0, 0, 0x7f, 0x7f, 0x7f, 0x7f, 1, 2]);
    expect(await readAudioTags(new Blob([truncated]))).toEqual({ title: null, artist: null, cover: null });
  });
});
