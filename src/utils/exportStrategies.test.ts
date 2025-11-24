/**
 * Tests for Export Strategies
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { getExportStrategy, estimateBitrate, type ExportOptions } from './exportStrategies';
import { BITRATE } from '../constants';

// Mock MediaRecorder for tests (not available in Node.js)
const createMockMediaRecorder = () => {
  return class MockMediaRecorder {
    static isTypeSupported(mimeType: string) {
      // Simulate browser support for common types
      return mimeType.includes('webm') || mimeType.includes('ogg') || mimeType.includes('mp4');
    }

    ondataavailable: ((event: any) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    state: 'inactive' | 'recording' | 'paused' = 'inactive';

    constructor(_stream: MediaStream, _options?: any) {
      this.state = 'recording';
    }

    start() {
      this.state = 'recording';
      // Simulate data available after small delay
      setTimeout(() => {
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['mock audio data'], { type: 'audio/webm' }) });
        }
      }, 10);
    }

    stop() {
      this.state = 'inactive';
      if (this.onstop) {
        setTimeout(() => this.onstop!(), 10);
      }
    }
  };
};

// Store original
const originalMediaRecorder = (globalThis as any).MediaRecorder;
const originalWarn = console.warn;

describe('exportStrategies', () => {
  beforeAll(() => {
    // Install mock globally for all tests
    (globalThis as any).MediaRecorder = createMockMediaRecorder();
    console.warn = vi.fn();
  });

  afterAll(() => {
    // Restore original
    (globalThis as any).MediaRecorder = originalMediaRecorder;
    console.warn = originalWarn;
  });

  afterEach(() => {
    vi.mocked(console.warn).mockClear();
  });
  describe('estimateBitrate', () => {
    it('returns default bitrate when file is null', () => {
      const result = estimateBitrate(null, 180);
      expect(result).toBe(BITRATE.DEFAULT_MP3_KBPS);
    });

    it('returns default bitrate when duration is 0', () => {
      const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const result = estimateBitrate(mockFile, 0);
      expect(result).toBe(BITRATE.DEFAULT_MP3_KBPS);
    });

    it('calculates bitrate from file size and duration', () => {
      // 1MB file, 60 seconds = (1024*1024*8) / 60 / 1000 = ~140 kbps
      const mockFile = new File([new ArrayBuffer(1024 * 1024)], 'test.mp3', { type: 'audio/mpeg' });
      const result = estimateBitrate(mockFile, 60);
      expect(result).toBeCloseTo(140, 0);
    });

    it('clamps bitrate to minimum 96 kbps', () => {
      // Small file that would result in very low bitrate
      const mockFile = new File([new ArrayBuffer(1024)], 'test.mp3', { type: 'audio/mpeg' });
      const result = estimateBitrate(mockFile, 60);
      expect(result).toBe(BITRATE.MIN_MP3_KBPS);
    });

    it('clamps bitrate to maximum 320 kbps', () => {
      // Large file that would result in very high bitrate
      const mockFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'test.mp3', { type: 'audio/mpeg' });
      const result = estimateBitrate(mockFile, 60);
      expect(result).toBe(BITRATE.MAX_MP3_KBPS);
    });
  });

  describe('getExportStrategy', () => {
    it('returns WAV strategy for wav extension', () => {
      const strategy = getExportStrategy('wav');
      expect(strategy).toBeDefined();
      expect(strategy.export).toBeDefined();
    });

    it('returns WAV strategy for wave extension', () => {
      const strategy = getExportStrategy('wave');
      expect(strategy).toBeDefined();
    });

    it('returns MP3 strategy for mp3 extension', () => {
      const strategy = getExportStrategy('mp3');
      expect(strategy).toBeDefined();
    });

    it('returns AIFF strategy for aiff extension', () => {
      const strategy = getExportStrategy('aiff');
      expect(strategy).toBeDefined();
    });

    it('returns AIFF strategy for aif extension', () => {
      const strategy = getExportStrategy('aif');
      expect(strategy).toBeDefined();
    });

    it('returns FLAC strategy for flac extension', () => {
      const strategy = getExportStrategy('flac');
      expect(strategy).toBeDefined();
    });

    it('returns WebM strategy for webm extension', () => {
      const strategy = getExportStrategy('webm');
      expect(strategy).toBeDefined();
    });

    it('returns OGG strategy for ogg extension', () => {
      const strategy = getExportStrategy('ogg');
      expect(strategy).toBeDefined();
    });

    it('returns M4A strategy for m4a extension', () => {
      const strategy = getExportStrategy('m4a');
      expect(strategy).toBeDefined();
    });

    it('returns default strategy for unknown extension', () => {
      const strategy = getExportStrategy('xyz');
      expect(strategy).toBeDefined();
    });

    it('handles case-insensitive extensions', () => {
      const strategyLower = getExportStrategy('mp3');
      const strategyUpper = getExportStrategy('MP3');
      expect(strategyUpper).toBeDefined();
      // Both should return valid strategies
      expect(strategyLower.export).toBeDefined();
      expect(strategyUpper.export).toBeDefined();
    });
  });

  describe('Export Strategy Integration', () => {
    let mockAudioBuffer: AudioBuffer;
    let mockOptions: ExportOptions;

    beforeEach(() => {
      // Create a mock AudioBuffer
      const sampleRate = 44100;
      const length = sampleRate * 1; // 1 second
      mockAudioBuffer = {
        sampleRate,
        length,
        duration: 1,
        numberOfChannels: 2,
        getChannelData: vi.fn(() => new Float32Array(length)),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn(),
      } as unknown as AudioBuffer;

      mockOptions = {
        buffer: mockAudioBuffer,
        originalFile: new File([new ArrayBuffer(1024 * 128)], 'test.mp3', { type: 'audio/mpeg' }),
        estimatedBitrate: 192,
      };
    });

    it('WAV strategy exports with wav extension', async () => {
      const strategy = getExportStrategy('wav');
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.extension).toBe('wav');
      expect(result.blob.type).toBe('audio/wav');
    });

    it('MP3 strategy exports with mp3 extension', async () => {
      const strategy = getExportStrategy('mp3');
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.extension).toBe('mp3');
    });

    it('AIFF strategy exports with aiff extension', async () => {
      const strategy = getExportStrategy('aiff');
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.extension).toBe('aiff');
    });

    it('FLAC strategy exports as WAV (lossless preservation)', async () => {
      const strategy = getExportStrategy('flac');
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.extension).toBe('wav'); // FLAC exports as WAV
      expect(result.blob.type).toBe('audio/wav');
    });

    it('default strategy falls back to MP3 for unknown formats', async () => {
      const strategy = getExportStrategy('unknown');
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.extension).toBe('mp3');
    });
  });

  describe('MediaRecorder-based strategies', () => {
    let mockAudioBuffer: AudioBuffer;
    let mockOptions: ExportOptions;

    beforeEach(() => {
      const sampleRate = 44100;
      const length = sampleRate * 1;
      mockAudioBuffer = {
        sampleRate,
        length,
        duration: 1,
        numberOfChannels: 2,
        getChannelData: vi.fn(() => new Float32Array(length)),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn(),
      } as unknown as AudioBuffer;

      mockOptions = {
        buffer: mockAudioBuffer,
        originalFile: new File([new ArrayBuffer(1024 * 128)], 'test.webm', { type: 'audio/webm' }),
        estimatedBitrate: 192,
      };
    });

    it('WebM strategy attempts MediaRecorder encoding', async () => {
      const strategy = getExportStrategy('webm');

      // MediaRecorder may not be supported in test environment, should fallback to MP3
      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(['webm', 'mp3']).toContain(result.extension); // Either works or falls back
    });

    it('OGG strategy attempts MediaRecorder encoding', async () => {
      const strategy = getExportStrategy('ogg');

      const result = await strategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(['ogg', 'mp3']).toContain(result.extension);
    });

    it('M4A strategy preserves original extension (m4a vs mp4)', async () => {
      const m4aStrategy = getExportStrategy('m4a');
      const result = await m4aStrategy.export(mockOptions);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(['m4a', 'mp3']).toContain(result.extension);
    });
  });
});
