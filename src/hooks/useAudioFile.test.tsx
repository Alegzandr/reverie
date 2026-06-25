/**
 * Tests for useAudioFile hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioFile } from './useAudioFile';
import type { AudioProcessingOptions } from '../utils/audioProcessor';

// Mock audioProcessor
vi.mock('../utils/audioProcessor', () => ({
  audioProcessor: {
    loadAudioFile: vi.fn(),
    processAudio: vi.fn(),
    getAudioContext: vi.fn(() => ({
      currentTime: 0,
      sampleRate: 44100,
    })),
  },
}));

// Mock extractAudioMetadata
vi.mock('../utils/audioMetadataExtractor', () => ({
  extractAudioMetadata: vi.fn(() => Promise.resolve({
    sampleRate: 44100,
    channels: 2,
    bitDepth: 16,
  })),
}));

describe('useAudioFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with no file loaded', () => {
      const { result } = renderHook(() => useAudioFile());

      expect(result.current.originalFile).toBeNull();
      expect(result.current.originalBuffer).toBeNull();
      expect(result.current.processedBuffer).toBeNull();
      expect(result.current.metadata).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
    });
  });

  describe('loadAudioFile', () => {
    it('loads audio file and extracts metadata', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      const mockBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 44100 * 180,
      } as AudioBuffer;

      vi.mocked(audioProcessor.loadAudioFile).mockResolvedValue(mockBuffer);

      const { result } = renderHook(() => useAudioFile());
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      await act(async () => {
        await result.current.loadAudioFile(mockFile);
      });

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.originalFile).toBe(mockFile);
      expect(result.current.originalBuffer).toBe(mockBuffer);
      expect(result.current.metadata).toBeDefined();
      expect(result.current.metadata?.sampleRate).toBe(44100);
    });

    it('sets loading state during file load', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      vi.mocked(audioProcessor.loadAudioFile).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as AudioBuffer), 100))
      );

      const { result } = renderHook(() => useAudioFile());
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      act(() => {
        result.current.loadAudioFile(mockFile);
      });

      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.progress).toBe(0);
    });

    it('handles load errors gracefully', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      vi.mocked(audioProcessor.loadAudioFile).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useAudioFile());
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      await act(async () => {
        await result.current.loadAudioFile(mockFile);
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeTruthy();
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toContain('Failed to load');
    });
  });

  describe('processAudio', () => {
    it('processes audio with given options', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      const mockOriginalBuffer = { duration: 180 } as AudioBuffer;
      const mockProcessedBuffer = { duration: 120 } as AudioBuffer;

      vi.mocked(audioProcessor.loadAudioFile).mockResolvedValue(mockOriginalBuffer);
      vi.mocked(audioProcessor.processAudio).mockResolvedValue(mockProcessedBuffer);

      const { result } = renderHook(() => useAudioFile());
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      // First load a file
      await act(async () => {
        await result.current.loadAudioFile(mockFile);
      });

      // Then process it
      const options: AudioProcessingOptions = {
        speedMultiplier: 1.5,
        reverbAmount: 0.3,
      };

      await act(async () => {
        await result.current.processAudio(options);
      });

      await waitFor(() => {
        expect(result.current.state.isProcessing).toBe(false);
      });

      expect(result.current.processedBuffer).toBe(mockProcessedBuffer);
    });

    it('updates progress during processing', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      vi.mocked(audioProcessor.processAudio).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as AudioBuffer), 200))
      );

      const { result } = renderHook(() => useAudioFile());

      await act(async () => {
        result.current.processAudio({
          speedMultiplier: 1.0,
          reverbAmount: 0,
        });
      });

      expect(result.current.state.isProcessing).toBe(true);
    });

    it('handles processing errors', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      vi.mocked(audioProcessor.processAudio).mockRejectedValue(new Error('Processing failed'));

      const { result } = renderHook(() => useAudioFile());

      await act(async () => {
        try {
          await result.current.processAudio({
            speedMultiplier: 1.0,
            reverbAmount: 0,
          });
        } catch (error) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeTruthy();
      });

      expect(result.current.state.isProcessing).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const { audioProcessor } = await import('../utils/audioProcessor');
      const mockBuffer = { duration: 180 } as AudioBuffer;
      vi.mocked(audioProcessor.loadAudioFile).mockResolvedValue(mockBuffer);

      const { result } = renderHook(() => useAudioFile());
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      // Load a file
      await act(async () => {
        await result.current.loadAudioFile(mockFile);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.originalFile).toBeNull();
      expect(result.current.originalBuffer).toBeNull();
      expect(result.current.processedBuffer).toBeNull();
      expect(result.current.metadata).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });
});
