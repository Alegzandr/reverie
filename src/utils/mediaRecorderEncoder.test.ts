import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encodeWithMediaRecorder } from './mediaRecorderEncoder';
import { AUDIO_PROCESSING, ERROR_MESSAGES } from '../constants';

const contexts: FakeContext[] = [];

class FakeContext {
  state: AudioContextState = 'suspended';
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  resume = vi.fn(async () => {
    if (FakeContext.resumable) this.state = 'running';
  });
  static resumable = true;
  source = { buffer: null, connect: vi.fn(), start: vi.fn(), onended: null as null | (() => void) };
  constructor() {
    contexts.push(this);
  }
  createMediaStreamDestination() {
    return { stream: {} };
  }
  createBufferSource() {
    return this.source;
  }
}

class FakeRecorder {
  static isTypeSupported = () => true;
  static throwOnConstruct = false;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor() {
    if (FakeRecorder.throwOnConstruct) throw new Error('recorder unavailable');
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x']) });
    this.onstop?.();
  }
}

const originalAudioContext = globalThis.AudioContext;
const originalMediaRecorder = (globalThis as any).MediaRecorder;
const buffer = { duration: 1 } as AudioBuffer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('encodeWithMediaRecorder', () => {
  beforeEach(() => {
    contexts.length = 0;
    FakeContext.resumable = true;
    FakeRecorder.throwOnConstruct = false;
    globalThis.AudioContext = FakeContext as any;
    (globalThis as any).MediaRecorder = FakeRecorder;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.AudioContext = originalAudioContext;
    (globalThis as any).MediaRecorder = originalMediaRecorder;
  });

  it('resumes a suspended context before recording', async () => {
    const pending = encodeWithMediaRecorder(buffer, { mimeType: 'audio/webm' });
    await flush();
    const ctx = contexts[0];
    expect(ctx.resume).toHaveBeenCalled();
    ctx.source.onended?.();
    await new Promise((resolve) => setTimeout(resolve, AUDIO_PROCESSING.MEDIA_RECORDER_STOP_DELAY_MS + 10));

    const blob = await pending;
    expect(blob.type).toBe('audio/webm');
    await flush();
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it('rejects (so the MP3 fallback runs) and closes when the context stays suspended', async () => {
    FakeContext.resumable = false;
    await expect(encodeWithMediaRecorder(buffer, { mimeType: 'audio/webm' })).rejects.toThrow(
      ERROR_MESSAGES.MEDIA_RECORDER_SUSPENDED,
    );
    await flush();
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
  });

  it('closes the context when the recorder cannot be constructed', async () => {
    FakeRecorder.throwOnConstruct = true;
    await expect(encodeWithMediaRecorder(buffer, { mimeType: 'audio/webm' })).rejects.toThrow('recorder unavailable');
    await flush();
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
  });

  it('gives up after the watchdog when playback never ends', async () => {
    vi.useFakeTimers();
    const pending = encodeWithMediaRecorder(buffer, { mimeType: 'audio/webm' });
    const outcome = expect(pending).rejects.toThrow(ERROR_MESSAGES.MEDIA_RECORDER_TIMEOUT);
    await vi.advanceTimersByTimeAsync(buffer.duration * 1000 + AUDIO_PROCESSING.MEDIA_RECORDER_WATCHDOG_MARGIN_MS + 1);
    await outcome;
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
  });
});
