import { useState, useCallback, useRef } from 'react';
import { audioProcessor } from '../utils/audioProcessor';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import { audioBufferToMp3, downloadBlob } from '../utils/mp3Encoder';

export interface ProcessingState {
  isLoading: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

export function useAudioProcessor() {
  const [state, setState] = useState<ProcessingState>({
    isLoading: false,
    isProcessing: false,
    isPlaying: false,
    progress: 0,
    error: null,
  });

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [volume, setVolume] = useState<number>(0.7);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const loadAudioFile = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    try {
      await audioProcessor.loadAudioFile(file);
      setOriginalFile(file);
      setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio file',
      }));
    }
  }, []);

  const processAudio = useCallback(async (options: AudioProcessingOptions) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 100);

      const buffer = await audioProcessor.processAudio(options);
      clearInterval(progressInterval);

      setProcessedBuffer(buffer);
      setState((prev) => ({ ...prev, isProcessing: false, progress: 100 }));

      return buffer;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process audio',
      }));
      throw error;
    }
  }, []);

  const playAudio = useCallback((buffer?: AudioBuffer) => {
    const audioContext = audioProcessor.getAudioContext();
    const bufferToPlay = buffer || processedBuffer || audioProcessor.getAudioBuffer();

    if (!bufferToPlay) {
      setState((prev) => ({ ...prev, error: 'No audio to play' }));
      return;
    }

    // Stop current playback if any
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
    }

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNodeRef.current = gainNode;

    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.onended = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
    };

    source.start(0);
    sourceNodeRef.current = source;
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [processedBuffer, volume]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      sourceNodeRef.current = null;
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const exportToMp3 = useCallback(async (filename?: string) => {
    const buffer = processedBuffer || audioProcessor.getAudioBuffer();
    if (!buffer) {
      throw new Error('No audio to export');
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const mp3Blob = await audioBufferToMp3(buffer);
      const defaultFilename = filename || `${originalFile?.name.replace('.mp3', '')}_processed.mp3` || 'processed_audio.mp3';
      downloadBlob(mp3Blob, defaultFilename);
      setState((prev) => ({ ...prev, isProcessing: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to export audio',
      }));
      throw error;
    }
  }, [processedBuffer, originalFile]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    // Update volume in real-time if audio is playing
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  const reset = useCallback(() => {
    stopAudio();
    setOriginalFile(null);
    setProcessedBuffer(null);
    setState({
      isLoading: false,
      isProcessing: false,
      isPlaying: false,
      progress: 0,
      error: null,
    });
  }, [stopAudio]);

  return {
    state,
    originalFile,
    processedBuffer,
    volume,
    loadAudioFile,
    processAudio,
    playAudio,
    stopAudio,
    exportToMp3,
    updateVolume,
    reset,
  };
}
