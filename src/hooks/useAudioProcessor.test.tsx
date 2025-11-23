import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAudioProcessor } from './useAudioProcessor';

const { mockAudioBuffer, mockDownload, mockToMp3, mockAudioContext, mockAudioProcessor } = vi.hoisted(() => {
  const buffer = new AudioBuffer({ length: 44100, numberOfChannels: 1, sampleRate: 44100 });
  let storedBuffer: AudioBuffer | null = buffer;
  const download = vi.fn();
  const toMp3 = vi.fn(async () => new Blob(['mp3'], { type: 'audio/mp3' }));

  const audioContext = {
    destination: {},
    currentTime: 0,
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() })),
    createBufferSource: vi.fn(() => {
      const node: any = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
      return node;
    }),
  };

  const processor = {
    loadAudioFile: vi.fn(async () => buffer),
    processAudio: vi.fn(async () => buffer),
    getAudioContext: vi.fn(() => audioContext as any),
    getAudioBuffer: vi.fn(() => storedBuffer as any),
  };

  (processor as any).__setBuffer = (next: AudioBuffer | null) => {
    storedBuffer = next;
  };

  return { mockAudioBuffer: buffer, mockDownload: download, mockToMp3: toMp3, mockAudioContext: audioContext, mockAudioProcessor: processor };
});

vi.mock('../utils/audioProcessor', () => ({
  audioProcessor: mockAudioProcessor,
}));

vi.mock('../utils/mp3Encoder', () => ({
  audioBufferToMp3: mockToMp3,
  downloadBlob: mockDownload,
}));

const realRaf = globalThis.requestAnimationFrame;
const realCancelRaf = globalThis.cancelAnimationFrame;

describe('useAudioProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.createGain.mockClear();
    mockAudioContext.createBufferSource.mockClear();
    (mockAudioProcessor as any).__setBuffer(mockAudioBuffer);
    (globalThis as any).requestAnimationFrame = vi.fn(() => 0 as unknown as number);
    (globalThis as any).cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (realRaf) {
      (globalThis as any).requestAnimationFrame = realRaf;
    }
    if (realCancelRaf) {
      (globalThis as any).cancelAnimationFrame = realCancelRaf;
    }
  });

  it('loads audio file and updates state', async () => {
    const file = new File(['data'], 'track.mp3', { type: 'audio/mp3' });
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      await result.current.loadAudioFile(file);
    });

    expect(mockAudioProcessor.loadAudioFile).toHaveBeenCalledWith(file);
    expect(result.current.originalFile).toBe(file);
    expect(result.current.originalBuffer).toBe(mockAudioBuffer);
    const expectedDuration = mockAudioBuffer.length / mockAudioBuffer.sampleRate;
    expect(result.current.duration).toBeCloseTo(expectedDuration);
    expect(result.current.state.progress).toBe(100);
  });

  it('handles load errors', async () => {
    mockAudioProcessor.loadAudioFile.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useAudioProcessor());
    const file = new File(['data'], 'broken.mp3', { type: 'audio/mp3' });

    await act(async () => {
      await result.current.loadAudioFile(file);
    });

    expect(result.current.state.error).toBe('fail');
  });

  it('handles load errors with non-error types', async () => {
    mockAudioProcessor.loadAudioFile.mockRejectedValueOnce('bad');
    const { result } = renderHook(() => useAudioProcessor());
    const file = new File(['data'], 'broken.mp3', { type: 'audio/mp3' });

    await act(async () => {
      await result.current.loadAudioFile(file);
    });

    expect(result.current.state.error).toBe('Failed to load audio file');
  });

  it('processes audio with progress updates', async () => {
    vi.useFakeTimers();
    mockAudioProcessor.processAudio.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockAudioBuffer), 200)));
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      const promise = result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
      await vi.advanceTimersByTimeAsync(250);
      await promise;
    });

    expect(mockAudioProcessor.processAudio).toHaveBeenCalled();
    expect(result.current.processedBuffer).toBe(mockAudioBuffer);
    expect(result.current.duration).toBeCloseTo(mockAudioBuffer.length / mockAudioBuffer.sampleRate);
    expect(result.current.playbackTime).toBe(0);
    expect(result.current.state.progress).toBe(100);
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('sets error on process failure', async () => {
    vi.useFakeTimers();
    mockAudioProcessor.processAudio.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      try {
        await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
      } catch (e) {
        // expected
      }
    });

    expect(result.current.state.error).toBe('boom');
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('sets fallback message on non-error process failure', async () => {
    vi.useFakeTimers();
    mockAudioProcessor.processAudio.mockRejectedValueOnce('bad');
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      try {
        await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
      } catch (e) {
        // expected
      }
    });

    expect(result.current.state.error).toBe('Failed to process audio');
  });

  it('plays and stops audio with gain control', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    const source = mockAudioContext.createBufferSource.mock.results[0].value;
    const gain = mockAudioContext.createGain.mock.results[0].value;

    expect(source.start).toHaveBeenCalledWith(0, 0);
    expect(gain.gain.value).toBeCloseTo(0.7);
    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.playbackTime).toBe(0);

    act(() => {
      result.current.updateVolume(0.3);
    });

    expect(gain.gain.value).toBe(0.3);

    act(() => {
      result.current.stopAudio();
    });

    expect(source.stop).toHaveBeenCalled();
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.playbackTime).toBeCloseTo(0);
  });

  it('swallows stop errors while switching sources', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    const firstSource = mockAudioContext.createBufferSource.mock.results[0].value;
    firstSource.stop.mockImplementation(() => {
      throw new Error('stopped');
    });

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    expect(firstSource.stop).toHaveBeenCalled();
  });

  it('swallows stop errors when stopping playback', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    const source = mockAudioContext.createBufferSource.mock.results[0].value;
    source.stop.mockImplementation(() => {
      throw new Error('stopped');
    });

    act(() => {
      result.current.stopAudio();
    });

    expect(source.stop).toHaveBeenCalled();
  });

  it('sets error when attempting to play without buffer', () => {
    const { result } = renderHook(() => useAudioProcessor());
    (mockAudioProcessor as any).__setBuffer(null);

    act(() => {
      result.current.playAudio();
    });

    expect(result.current.state.error).toBe('No audio to play');
  });

  it('exports to mp3 using processed buffer and default filename', async () => {
    const { result } = renderHook(() => useAudioProcessor());
    const file = new File(['data'], 'demo.mp3', { type: 'audio/mp3' });

    await act(async () => {
      await result.current.loadAudioFile(file);
    });

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    await act(async () => {
      await result.current.exportToMp3();
    });

    expect(mockToMp3).toHaveBeenCalledWith(mockAudioBuffer);
    expect(mockDownload).toHaveBeenCalledWith(expect.any(Blob), 'demo_processed.mp3');
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('exports with fallback filename when no original file', async () => {
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
    });

    await act(async () => {
      await result.current.exportToMp3();
    });

    expect(mockDownload).toHaveBeenCalledWith(expect.any(Blob), 'processed_audio.mp3');
  });

  it('throws when exporting without audio and records error', async () => {
    const { result } = renderHook(() => useAudioProcessor());
    (mockAudioProcessor as any).__setBuffer(null);

    await expect(result.current.exportToMp3()).rejects.toThrow('No audio to export');
  });

  it('handles export errors', async () => {
    mockToMp3.mockRejectedValueOnce(new Error('export fail'));
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
    });

    await act(async () => {
      try {
        await result.current.exportToMp3('custom.mp3');
      } catch (e) {
        // expected
      }
    });

    expect(result.current.state.error).toBe('export fail');
  });

  it('handles export errors with non-error values', async () => {
    mockToMp3.mockRejectedValueOnce('fail');
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
    });

    await act(async () => {
      try {
        await result.current.exportToMp3('custom.mp3');
      } catch (e) {
        // expected
      }
    });

    expect(result.current.state.error).toBe('Failed to export audio');
  });

  it('seeks while paused and updates playhead', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.seekTo(0.5);
    });

    expect(result.current.playbackTime).toBeCloseTo(0.5);
  });

  it('restarts playback when seeking during preview', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    act(() => {
      result.current.seekTo(0.25);
    });

    const secondSource = mockAudioContext.createBufferSource.mock.results[1].value;
    expect(secondSource.start).toHaveBeenCalledWith(0, expect.any(Number));
  });

  it('ignores stale onended callbacks after restart', () => {
    const { result } = renderHook(() => useAudioProcessor());

    act(() => {
      result.current.playAudio(mockAudioBuffer);
    });

    const firstSource = mockAudioContext.createBufferSource.mock.results[0].value;

    act(() => {
      result.current.playAudio(mockAudioBuffer, 0.5);
    });

    act(() => {
      firstSource.onended?.();
    });

    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.playbackTime).toBeCloseTo(0.5);
  });

  it('resets processing state and buffer', async () => {
    const { result } = renderHook(() => useAudioProcessor());

    await act(async () => {
      await result.current.loadAudioFile(new File(['data'], 'clip.mp3', { type: 'audio/mp3' }));
      await result.current.processAudio({ speedMultiplier: 1, reverbAmount: 0, preservePitch: false });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.originalFile).toBeNull();
    expect(result.current.processedBuffer).toBeNull();
    expect(result.current.state.progress).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.playbackTime).toBe(0);
  });
});
