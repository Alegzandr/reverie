import { describe, it, expect, vi } from 'vitest';
import { audioBufferToFlac } from './flacEncoder';

const { flac } = vi.hoisted(() => ({
  flac: {
    isReady: vi.fn(() => true),
    on: vi.fn(),
    create_libflac_encoder: vi.fn(() => 1),
    init_encoder_stream: vi.fn((_id: number, write: (data: Uint8Array, n: number) => void) => {
      write(new Uint8Array([0x66, 0x4c, 0x61, 0x43]), 4);
      return 0;
    }),
    FLAC__stream_encoder_process_interleaved: vi.fn(() => true),
    FLAC__stream_encoder_finish: vi.fn(),
    FLAC__stream_encoder_delete: vi.fn(),
  },
}));

vi.mock('libflacjs/dist/libflac.wasm.wasm?url', () => ({ default: '/libflac.wasm' }));
vi.mock('libflacjs/dist/libflac.wasm.js', () => ({ default: flac }));

describe('audioBufferToFlac', () => {
  it('retries loading libFLAC after a failed load instead of caching the failure', async () => {
    const buffer = new AudioBuffer({ numberOfChannels: 2, length: 4, sampleRate: 44100 });
    flac.isReady.mockImplementationOnce(() => {
      throw new Error('wasm fetch failed');
    });

    await expect(audioBufferToFlac(buffer)).rejects.toThrow('wasm fetch failed');

    const blob = await audioBufferToFlac(buffer);
    expect(blob.type).toBe('audio/flac');
    expect(blob.size).toBe(4);
  });
});
