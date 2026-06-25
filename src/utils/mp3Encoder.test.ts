import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioBufferToMp3 } from './mp3Encoder';

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
    const mono = new AudioBuffer({ numberOfChannels: 1, length: 3, sampleRate: 44100 });
    mono.getChannelData(0).set([-2, 0.5, 1]);

    const blob = await audioBufferToMp3(mono as any, 256);
    expect(blob.type).toBe('audio/mp3');
    expect(encodeBuffer).toHaveBeenCalledWith(expect.any(Int16Array), undefined);

    const stereo = new AudioBuffer({ numberOfChannels: 2, length: 3, sampleRate: 44100 });
    stereo.getChannelData(0).set([0.1, 0.2, 0.3]);
    stereo.getChannelData(1).set([0.4, 0.5, 0.6]);

    await audioBufferToMp3(stereo as any);
    expect(encodeBuffer).toHaveBeenCalledWith(expect.any(Int16Array), expect.any(Int16Array));
    expect(flush).toHaveBeenCalled();
  });
});
