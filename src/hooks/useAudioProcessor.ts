import { useCallback, useEffect, useMemo, useState } from 'react';
import { audioProcessor } from '../utils/audioProcessor';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import { useAudioFile } from './useAudioFile';
import { useAudioPlayback } from './useAudioPlayback';
import { useAudioExport } from './useAudioExport';

export interface ProcessingState {
  isLoading: boolean;
  isProcessing: boolean;
  isExporting: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

/**
 * Orchestrates audio file management, playback, and export using dedicated hooks
 */
export function useAudioProcessor() {
  const [error, setError] = useState<string | null>(null);
  const {
    state: fileState,
    originalFile,
    originalBuffer,
    processedBuffer,
    metadata,
    loadAudioFile: loadFile,
    processAudio: processFile,
    reset: resetFile,
    getBufferDuration,
  } = useAudioFile();

  const getPlaybackBuffer = useCallback(
    () => processedBuffer || originalBuffer || audioProcessor.getAudioBuffer(),
    [processedBuffer, originalBuffer],
  );

  const {
    state: playbackState,
    playAudio,
    stopAudio,
    seekTo,
    updateVolume,
    attachBuffer,
    resetPlayback,
  } = useAudioPlayback({
    getAudioContext: () => audioProcessor.getAudioContext(),
    getBufferDuration,
    getFallbackBuffer: getPlaybackBuffer,
    onError: setError,
  });

  const {
    state: exportState,
    exportProcessedAudio,
    resetExport,
  } = useAudioExport({
    getBuffer: () => processedBuffer || audioProcessor.getAudioBuffer(),
    originalFile,
    metadata,
    getBufferDuration,
    // Effect label is provided by UI via exportProcessedAudio options when available
    onError: setError,
  });

  const combinedError = useMemo(
    () => error ?? fileState.error ?? playbackState.error ?? exportState.error ?? null,
    [error, fileState.error, playbackState.error, exportState.error],
  );

  useEffect(() => {
    if (fileState.error) {
      setError(fileState.error);
    }
  }, [fileState.error]);

  const loadAudioFile = useCallback(async (file: File) => {
    setError(null);
    const buffer = await loadFile(file);
    const nextBuffer = buffer || audioProcessor.getAudioBuffer();
    attachBuffer(nextBuffer, { resetPosition: true });
    return buffer;
  }, [attachBuffer, loadFile]);

  const processAudio = useCallback(async (options: AudioProcessingOptions) => {
    setError(null);
    const buffer = await processFile(options);
    attachBuffer(buffer, { resetPosition: true });
    return buffer;
  }, [attachBuffer, processFile]);

  const reset = useCallback(() => {
    stopAudio();
    resetFile();
    resetPlayback();
    resetExport();
    setError(null);
  }, [resetExport, resetFile, resetPlayback, stopAudio]);

  return {
    state: {
      isLoading: fileState.isLoading,
      isProcessing: fileState.isProcessing,
      isExporting: exportState.isExporting,
      isPlaying: playbackState.isPlaying,
      progress: fileState.progress,
      error: combinedError,
    } as ProcessingState,
    originalFile,
    originalBuffer,
    processedBuffer,
    playbackTime: playbackState.playbackTime,
    duration: playbackState.duration,
    volume: playbackState.volume,
    metadata,
    loadAudioFile,
    processAudio,
    playAudio,
    stopAudio,
    exportProcessedAudio,
    updateVolume,
    seekTo,
    reset,
  };
}
