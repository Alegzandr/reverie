import { describe, it, expect } from 'vitest';
import { fileDigest, sameContent } from './fileDigest';

const song = (body: string, name = 'a.mp3', lastModified = 1) => new File([body], name, { lastModified });

describe('fileDigest', () => {
  it('hashes content, not name or date', async () => {
    expect(await fileDigest(song('abc'))).toBe(await fileDigest(song('abc', 'other.flac', 99)));
    expect(await fileDigest(song('abc'))).not.toBe(await fileDigest(song('abd')));
  });

  it('memoizes per blob', () => {
    const f = song('abc');
    expect(fileDigest(f)).toBe(fileDigest(f));
  });
});

describe('sameContent', () => {
  it('matches byte-identical files only', async () => {
    expect(await sameContent(song('abc'), song('abc', 'copy.mp3', 7))).toBe(true);
    expect(await sameContent(song('abc'), song('abd'))).toBe(false);
    expect(await sameContent(song('abc'), song('abcd'))).toBe(false);
  });
});
