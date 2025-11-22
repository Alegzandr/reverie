import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioBufferToMp3, downloadBlob } from './mp3Encoder';

const { encodeBuffer, flush } = vi.hoisted(() => ({
  encodeBuffer: vi.fn(() => [1, 2]),
  flush: vi.fn(() => [3]),
}));

vi.mock('@breezystack/lamejs', () => ({
  Mp3Encoder: class {
    channels: number;
    sampleRate: number;
    bitRate: number;
    encodeBuffer = encodeBuffer;
    flush = flush;

    constructor(channels: number, sampleRate: number, bitRate: number) {
      this.channels = channels;
      this.sampleRate = sampleRate;
      this.bitRate = bitRate;
    }
  },
}));

describe('mp3Encoder utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes mono and stereo buffers into mp3 blob', async () => {
    const mono = new AudioBuffer(1, 3, 44100);
    mono.getChannelData(0).set([-2, 0.5, 1]);

    const blob = await audioBufferToMp3(mono as any, 256);
    expect(blob.type).toBe('audio/mp3');
    expect(encodeBuffer).toHaveBeenCalledWith(expect.any(Int16Array), undefined);

    const stereo = new AudioBuffer(2, 3, 44100);
    stereo.getChannelData(0).set([0.1, 0.2, 0.3]);
    stereo.getChannelData(1).set([0.4, 0.5, 0.6]);

    await audioBufferToMp3(stereo as any);
    expect(encodeBuffer).toHaveBeenCalledWith(expect.any(Int16Array), expect.any(Int16Array));
    expect(flush).toHaveBeenCalled();
  });

  it('downloads blob via anchor element', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const blob = new Blob(['data'], { type: 'text/plain' });

    downloadBlob(blob, 'file.txt');

    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
